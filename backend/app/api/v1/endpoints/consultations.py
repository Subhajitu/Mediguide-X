from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import uuid
import datetime

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.consultation import ChatMessageRequest, ChatMessageResponse
from app.db.models.family_member import FamilyMember
from app.db.models.consultation import Consultation
from app.db.models.chat_message import ChatMessage
from app.services.context_engine import context_engine
from app.services.bedrock import bedrock_service

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
        sender="user",
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
        sender="ai",
        text=ai_reply
    )
    db.add(ai_msg)
    await db.commit()

    # In Sprint 3 we will generate dynamic suggestion chips based on the context.
    # For now, we return default suggestions.
    suggestions = ["Should I see a doctor?", "What are home remedies?", "Explain my recent labs"]

    return ChatMessageResponse(
        consultation_id=consultation_id,
        user_message=request.message,
        ai_message=ai_reply,
        suggestions=suggestions,
        disclaimer=get_medical_disclaimer(),
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
