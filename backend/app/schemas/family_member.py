from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List
from app.db.models.family_member import RelationshipEnum, GenderEnum

class FamilyMemberCreate(BaseModel):
    name: str
    relationship: RelationshipEnum
    date_of_birth: date
    gender: GenderEnum
    blood_group: Optional[str] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []

class FamilyMemberResponse(FamilyMemberCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
