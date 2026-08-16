from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List

class ChatMessageRequest(BaseModel):
    consultation_id: Optional[UUID] = None
    message: str = Field(..., min_length=1, max_length=2000)
    document_s3_key: Optional[str] = Field(
        None,
        description="S3 key of a previously uploaded medical document to analyze in this message"
    )

class ChatMessageResponse(BaseModel):
    consultation_id: UUID
    user_message: str
    ai_message: str
    suggestions: List[str]
    disclaimer: str
    timestamp: str

class MessageItem(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: str
    document_s3_key: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    title: str
    date: str
    messages: List[MessageItem]
