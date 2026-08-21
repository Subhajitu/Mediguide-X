from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class MedicationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    dosage: str = Field(..., min_length=1, max_length=100)
    frequency: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True

class MedicationCreate(MedicationBase):
    pass

class MedicationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    dosage: Optional[str] = Field(None, min_length=1, max_length=100)
    frequency: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None

class MedicationResponse(MedicationBase):
    id: UUID
    family_member_id: UUID

    class Config:
        from_attributes = True
