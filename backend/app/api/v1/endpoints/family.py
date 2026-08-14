from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import uuid
from typing import List, Optional, Union
from pydantic import BaseModel, Field, ConfigDict

from app.db.session import get_db
from app.core.security import get_current_user
from app.db.models.family_member import FamilyMember

router = APIRouter()

from datetime import date

class FamilyMemberCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    relationship: str
    date_of_birth: date
    gender: str
    blood_group: Union[str, None] = None
    medical_conditions: List[str] = []
    allergies: List[str] = []

class FamilyMemberResponse(BaseModel):
    id: UUID
    name: str
    relationship: str
    date_of_birth: date
    gender: str
    blood_group: Union[str, None] = None
    medical_conditions: List[str] = []
    allergies: List[str] = []
    
    model_config = ConfigDict(from_attributes=True)

@router.post("", response_model=FamilyMemberResponse)
async def create_family_member(
    member_in: FamilyMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum
    
    new_member = FamilyMember(
        id=uuid.uuid4(),
        user_id=user_id,
        name=member_in.name,
        relationship=RelationshipEnum(member_in.relationship.lower()),
        date_of_birth=member_in.date_of_birth,
        gender=GenderEnum(member_in.gender.lower()),
        blood_group=member_in.blood_group,
        medical_conditions=member_in.medical_conditions,
        allergies=member_in.allergies
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    return new_member

@router.get("", response_model=List[FamilyMemberResponse])
async def list_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(FamilyMember.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/{member_id}", response_model=FamilyMemberResponse)
async def update_family_member(
    member_id: UUID,
    member_in: FamilyMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(FamilyMember.id == member_id, FamilyMember.user_id == user_id)
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
        
    from app.db.models.family_member import RelationshipEnum, GenderEnum
    
    member.name = member_in.name
    member.relationship = RelationshipEnum(member_in.relationship.lower())
    member.date_of_birth = member_in.date_of_birth
    member.gender = GenderEnum(member_in.gender.lower())
    member.blood_group = member_in.blood_group
    member.medical_conditions = member_in.medical_conditions
    member.allergies = member_in.allergies
    
    await db.commit()
    await db.refresh(member)
    return member

@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(FamilyMember.id == member_id, FamilyMember.user_id == user_id)
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
        
    await db.delete(member)
    await db.commit()
    return None
