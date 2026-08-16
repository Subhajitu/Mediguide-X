from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserProfileResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    created_at: datetime
    family_members_count: int = 0


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
