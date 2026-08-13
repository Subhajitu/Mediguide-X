from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import uuid
import datetime

from app.db.session import get_db
from app.core.security import get_current_user
from app.core.guardrails import guardrails
from app.schemas.consultation import ChatMessageRequest, ChatMessageResponse
from app.schemas.care_plan import CarePlanSchema
from app.db.models.family_member import FamilyMember
from app.db.models.consultation import Consultation
from app.db.models.chat_message import ChatMessage, SenderEnum
from app.services.context_engine import context_engine
from app.services.bedrock import bedrock_service
from app.services.care_plan import care_plan_service

router = APIRouter()

def get_medical_disclaimer() -> str:
    return "Disclaimer: Mediguide X provides AI-generated informational guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns."

@router.post("/{family_member_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    family_member_id: UUID,
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # 0. Safety Guardrail
    if not guardrails.is_medical_query(request.message):
        return ChatMessageResponse(
            consultation_id=request.consultation_id or uuid.uuid4(),
            user_message=request.message,
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
    consultation_id = request.consultation_id
    if not consultation_id:
        consultation_id = uuid.uuid4()
        new_consultation = Consultation(
            id=consultation_id,
            family_member_id=family_member_id,
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message
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

    # 3. Save User Message
    user_msg_id = uuid.uuid4()
    user_msg = ChatMessage(
        id=user_msg_id,
        consultation_id=consultation_id,
        sender=SenderEnum.user,
        text=request.message
    )
    db.add(user_msg)
    await db.commit() # commit so context engine can see it

    # 4. Build Context and call Nova Lite
    try:
        patient_context = await context_engine.build_patient_context(db, family_member_id, consultation_id)
        ai_reply = await bedrock_service.invoke_nova_lite_chat(patient_context, request.message)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI Service Error")

    # 5. Save AI Message
    ai_msg_id = uuid.uuid4()
    ai_msg = ChatMessage(
        id=ai_msg_id,
        consultation_id=consultation_id,
        sender=SenderEnum.ai,
        text=ai_reply
    )
    db.add(ai_msg)
    await db.commit()

    suggestions = ["Should I see a doctor?", "What are home remedies?", "Explain my recent labs"]

    return ChatMessageResponse(
        consultation_id=consultation_id,
        user_message=request.message,
        ai_message=ai_reply,
        suggestions=suggestions,
        disclaimer=get_medical_disclaimer(),
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )

@router.post("/{consultation_id}/care-plan", response_model=CarePlanSchema)
async def generate_care_plan(
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
    patient_context = await context_engine.build_patient_context(db, consultation.family_member_id, None)
    
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
