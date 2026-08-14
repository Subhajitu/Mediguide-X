import uuid
from sqlalchemy import Column, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class SenderEnum(str, enum.Enum):
    user = "user"
    ai = "ai"

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(SQLEnum(SenderEnum), nullable=False)
    text = Column(Text, nullable=False)
    structured_json = Column(JSONB, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    consultation = relationship("Consultation", back_populates="messages")
