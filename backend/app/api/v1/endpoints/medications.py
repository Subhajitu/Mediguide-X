from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.db.models.medication import Medication
from app.db.models.family_member import FamilyMember
from app.schemas.medication import MedicationCreate, MedicationUpdate, MedicationResponse
from app.core.security import get_current_user

router = APIRouter()

@router.get("/{family_member_id}", response_model=List[MedicationResponse])
async def list_medications(
    family_member_id: UUID,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    
    # Verify ownership
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == family_member_id, FamilyMember.user_id == user_id))
    family_member = result.scalar_one_or_none()
    if not family_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    stmt = select(Medication).where(Medication.family_member_id == family_member_id)
    if not include_inactive:
        stmt = stmt.where(Medication.is_active == True)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/{family_member_id}", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(
    family_member_id: UUID,
    medication_in: MedicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    
    # Verify ownership
    result = await db.execute(select(FamilyMember).where(FamilyMember.id == family_member_id, FamilyMember.user_id == user_id))
    family_member = result.scalar_one_or_none()
    if not family_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    new_medication = Medication(
        family_member_id=family_member_id,
        **medication_in.model_dump()
    )
    db.add(new_medication)
    await db.commit()
    await db.refresh(new_medication)
    return new_medication

@router.put("/{medication_id}", response_model=MedicationResponse)
async def update_medication(
    medication_id: UUID,
    medication_in: MedicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    
    # Verify ownership through join
    stmt = (
        select(Medication)
        .join(FamilyMember, Medication.family_member_id == FamilyMember.id)
        .where(Medication.id == medication_id, FamilyMember.user_id == user_id)
    )
    result = await db.execute(stmt)
    medication = result.scalar_one_or_none()
    
    if not medication:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Medication not found or access denied")

    update_data = medication_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(medication, field, value)
        
    await db.commit()
    await db.refresh(medication)
    return medication

@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    medication_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    user_id = UUID(current_user["sub"])
    
    # Verify ownership through join
    stmt = (
        select(Medication)
        .join(FamilyMember, Medication.family_member_id == FamilyMember.id)
        .where(Medication.id == medication_id, FamilyMember.user_id == user_id)
    )
    result = await db.execute(stmt)
    medication = result.scalar_one_or_none()
    
    if not medication:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Medication not found or access denied")

    await db.delete(medication)
    await db.commit()
