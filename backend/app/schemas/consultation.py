from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List

class ChatMessageRequest(BaseModel):
    consultation_id: Optional[UUID] = None
    message: str = Field(..., min_length=1, max_length=2000)

class ChatMessageResponse(BaseModel):
    consultation_id: UUID
    user_message: str
    ai_message: str
    suggestions: List[str]
    disclaimer: str
    timestamp: str
