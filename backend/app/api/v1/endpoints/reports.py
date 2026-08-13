from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from uuid import UUID
import uuid

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.report import ReportUploadUrlRequest, ReportUploadUrlResponse, ReportListResponse, MedicalRecordItem
from app.db.models.family_member import FamilyMember
from app.db.models.medical_record import MedicalRecord
from app.services.s3 import s3_service

router = APIRouter()

@router.post("/upload-url", response_model=ReportUploadUrlResponse)
async def get_upload_url(
    request: ReportUploadUrlRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Verify the user owns this family member
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(
        FamilyMember.id == request.family_member_id,
        FamilyMember.user_id == user_id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to specified family member")

    # Generate presigned URL
    s3_data = s3_service.generate_presigned_upload_url(
        family_member_id=request.family_member_id,
        filename=request.filename,
        content_type=request.content_type
    )

    # Create Medical Record entry
    record_id = uuid.uuid4()
    new_record = MedicalRecord(
        id=record_id,
        family_member_id=request.family_member_id,
        title=request.title,
        record_type=request.record_type,
        s3_key=s3_data["s3_key"],
        record_date=request.record_date
    )
    db.add(new_record)
    await db.commit()

    return ReportUploadUrlResponse(
        record_id=record_id,
        s3_key=s3_data["s3_key"],
        upload_url=s3_data["upload_url"],
        expires_in_seconds=s3_data["expires_in_seconds"]
    )

@router.get("/{family_member_id}", response_model=ReportListResponse)
async def list_reports(
    family_member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    user_id = UUID(current_user["sub"])
    stmt = select(FamilyMember).where(
        FamilyMember.id == family_member_id,
        FamilyMember.user_id == user_id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Fetch records
    stmt = select(MedicalRecord).where(
        MedicalRecord.family_member_id == family_member_id
    ).order_by(desc(MedicalRecord.record_date))
    
    records = await db.execute(stmt)
    record_items = []
    
    for r in records.scalars().all():
        # Generate read URL
        download_url = ""
        if r.s3_key:
            download_url = s3_service.generate_presigned_read_url(r.s3_key)
            
        record_items.append(MedicalRecordItem(
            id=r.id,
            title=r.title,
            record_type=r.record_type.value if hasattr(r.record_type, 'value') else str(r.record_type),
            record_date=r.record_date,
            summary=r.summary,
            download_url=download_url
        ))

    return ReportListResponse(records=record_items)
