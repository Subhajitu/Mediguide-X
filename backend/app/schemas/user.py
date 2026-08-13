from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserProfileResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    created_at: datetime
    family_members_count: int = 0
