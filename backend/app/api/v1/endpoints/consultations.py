from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import uuid
import datetime
import asyncio

from app.db.session import get_db
from app.core.security import get_current_user
from app.core.guardrails import guardrails
from app.schemas.consultation import ChatMessageRequest, ChatMessageResponse, ConversationResponse, MessageItem
from app.schemas.care_plan import CarePlanSchema
from typing import List
from app.core.limiter import limiter
from app.core.config import settings
from app.db.models.family_member import FamilyMember
from app.db.models.consultation import Consultation
from app.db.models.chat_message import ChatMessage, SenderEnum
from app.db.models.medical_record import MedicalRecord
from app.services.context_engine import context_engine
from app.services.bedrock import bedrock_service
from app.services.care_plan import care_plan_service
from app.services.s3 import s3_service

router = APIRouter()

def get_medical_disclaimer() -> str:
    return "Disclaimer: Mediguide X provides AI-generated informational guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns."

@router.get("/{family_member_id}", response_model=List[ConversationResponse])
async def get_consultations(
    family_member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # 1. Verify ownership
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(
        FamilyMember.id == family_member_id,
        FamilyMember.user_id == user_id
    )
    if not (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # 2. Fetch consultations
    stmt = select(Consultation).where(
        Consultation.family_member_id == family_member_id
    ).order_by(Consultation.created_at.desc())
    
    result = await db.execute(stmt)
    consultations = result.scalars().all()
    
    consultation_ids = [c.id for c in consultations]
    messages_by_consultation = {c.id: [] for c in consultations}
    
    if consultation_ids:
        stmt_msgs = select(ChatMessage).where(ChatMessage.consultation_id.in_(consultation_ids))
        msgs_result = await db.execute(stmt_msgs)
        all_msgs = msgs_result.scalars().all()
        for m in all_msgs:
            messages_by_consultation[m.consultation_id].append(m)
    
    response = []
    for c in consultations:
        c_messages = messages_by_consultation.get(c.id, [])
        messages = sorted(c_messages, key=lambda x: x.timestamp or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc))
        msgs = []
        for m in messages:
            msgs.append(MessageItem(
                id=str(m.id),
                sender=m.sender.value if hasattr(m.sender, 'value') else str(m.sender),
                text=m.text,
                timestamp=m.timestamp.strftime("%I:%M %p") if m.timestamp else "Unknown",
                document_s3_key=m.document_s3_key,
            ))
            
        date_str = c.created_at.strftime("%a, %b %d") if c.created_at else "Today"
        response.append(ConversationResponse(
            id=str(c.id),
            title=c.title or "Consultation",
            date=date_str,
            messages=msgs
        ))
        
    return response

@router.post("/{family_member_id}/messages", response_model=ChatMessageResponse)
@limiter.limit("30/minute")
async def send_chat_message(
    request: Request,
    family_member_id: UUID,
    body: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # 0. Safety Guardrail
    if not guardrails.is_medical_query(body.message):
        return ChatMessageResponse(
            consultation_id=body.consultation_id or uuid.uuid4(),
            user_message=body.message,
            ai_message=guardrails.get_redirect_message(),
            suggestions=["I have a headache", "What are diabetes symptoms?"],
            disclaimer=get_medical_disclaimer(),
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )

    # 1. Verify ownership
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(
        FamilyMember.id == family_member_id,
        FamilyMember.user_id == user_id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # 2. Get or Create Consultation
    consultation_id = body.consultation_id
    if not consultation_id:
        consultation_id = uuid.uuid4()
        new_consultation = Consultation(
            id=consultation_id,
            family_member_id=family_member_id,
            title=body.message[:50] + "..." if len(body.message) > 50 else body.message
        )
        db.add(new_consultation)
        await db.flush()
    else:
        # Verify consultation belongs to family member
        stmt = select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.family_member_id == family_member_id
        )
        if not (await db.execute(stmt)).scalar_one_or_none():
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    # 3. Fetch conversation history BEFORE saving the new user message
    # (we don't want the current message included in its own history)
    history = await context_engine.get_conversation_history(
        db, consultation_id, history_turns=settings.AI_HISTORY_TURNS
    )

    # 4. Save User Message
    user_msg_id = uuid.uuid4()
    user_msg = ChatMessage(
        id=user_msg_id,
        consultation_id=consultation_id,
        sender=SenderEnum.user,
        text=body.message,
        document_s3_key=body.document_s3_key,
        timestamp=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(user_msg)
    await db.commit()

    # 5. Build patient context and call appropriate Nova model
    try:
        patient_context = await context_engine.build_patient_context(db, family_member_id)

        if body.document_s3_key:
            # Validate that the s3_key belongs to a record owned by this user's family member
            stmt_rec = select(MedicalRecord).join(FamilyMember).where(
                MedicalRecord.s3_key == body.document_s3_key,
                FamilyMember.user_id == user_id
            )
            rec_result = await db.execute(stmt_rec)
            if not rec_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to the specified document"
                )

            # Fetch document bytes from S3
            loop = asyncio.get_event_loop()
            document_bytes = await loop.run_in_executor(
                None, s3_service._get_object_bytes, body.document_s3_key
            )
            filename = body.document_s3_key.split('/')[-1]

            ai_reply, suggestions = await bedrock_service.invoke_nova_pro_with_document(
                patient_context, history, body.message, document_bytes, filename
            )
        else:
            ai_reply, suggestions = await bedrock_service.invoke_nova_lite_chat_with_history(
                patient_context, history, body.message
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI Service Error")

    # 6. Save AI Message
    ai_msg_id = uuid.uuid4()
    ai_msg = ChatMessage(
        id=ai_msg_id,
        consultation_id=consultation_id,
        sender=SenderEnum.ai,
        text=ai_reply,
        timestamp=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(ai_msg)
    await db.commit()

    return ChatMessageResponse(
        consultation_id=consultation_id,
        user_message=body.message,
        ai_message=ai_reply,
        suggestions=suggestions,
        disclaimer=get_medical_disclaimer(),
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

@router.post("/{consultation_id}/care-plan", response_model=CarePlanSchema)
@limiter.limit("5/minute")
async def generate_care_plan(
    request: Request,
    consultation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # 1. Fetch Consultation & Verify Ownership
    user_id = UUID(current_user["sub"])
    stmt = select(Consultation).join(FamilyMember).where(
        Consultation.id == consultation_id,
        FamilyMember.user_id == user_id
    )
    result = await db.execute(stmt)
    consultation = result.scalar_one_or_none()
    
    if not consultation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    # 2. Build Context and Transcript
    patient_context = await context_engine.build_patient_context(db, consultation.family_member_id)
    
    from sqlalchemy import asc
    stmt_chat = select(ChatMessage).where(
        ChatMessage.consultation_id == consultation_id
    ).order_by(asc(ChatMessage.timestamp))
    result_chat = await db.execute(stmt_chat)
    chat_messages = result_chat.scalars().all()
    
    transcript_lines = []
    for msg in chat_messages:
        sender_str = "User" if msg.sender.value == "user" else "AI"
        transcript_lines.append(f"{sender_str}: {msg.text}")
    transcript = "\n".join(transcript_lines)

    # 3. Generate structured Care Plan via Nova Pro
    try:
        care_plan = await care_plan_service.generate_care_plan(patient_context, transcript)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to generate valid care plan: {str(e)}")

    # 4. Save to database
    consultation.care_plan_summary = care_plan.model_dump()
    await db.commit()

    return care_plan
