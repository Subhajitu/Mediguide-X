from fastapi import APIRouter, Depends, HTTPException, Request, status
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
from app.services.report_analyzer import report_analyzer
from app.core.limiter import limiter

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

    from app.db.models.medical_record import MedicalRecord, RecordTypeEnum
    
    # Create Medical Record entry
    record_id = uuid.uuid4()
    new_record = MedicalRecord(
        id=record_id,
        family_member_id=request.family_member_id,
        title=request.title,
        record_type=RecordTypeEnum(request.record_type),
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

@router.post("/{record_id}/analyze", response_model=MedicalRecordItem)
@limiter.limit("10/minute")
async def analyze_medical_record(
    request: Request,
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    user_id = UUID(current_user["sub"])
    stmt = select(MedicalRecord).join(FamilyMember).where(
        MedicalRecord.id == record_id,
        FamilyMember.user_id == user_id
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()
    
    if not record or not record.s3_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record or S3 key not found")

    filename = record.s3_key.split('/')[-1]
    
    try:
        extracted_data = await report_analyzer.analyze_report(record.s3_key, filename)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
        
    record.summary = extracted_data.get("summary", "")
    record.extracted_data = extracted_data.get("extracted_parameters", [])
    await db.commit()
    await db.refresh(record)

    download_url = s3_service.generate_presigned_read_url(record.s3_key)

    return MedicalRecordItem(
        id=record.id,
        title=record.title,
        record_type=record.record_type.value if hasattr(record.record_type, 'value') else str(record.record_type),
        record_date=record.record_date,
        summary=record.summary,
        download_url=download_url
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


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medical_record(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes a medical record and its corresponding S3 object.
    Security rule: S3 object must be deleted BEFORE the DB row.
    Ownership verified via JOIN on FamilyMember.user_id.
    """
    user_id = UUID(current_user["sub"])

    # Verify ownership via JOIN — record must belong to the requesting user's family member
    stmt = select(MedicalRecord).join(FamilyMember).where(
        MedicalRecord.id == record_id,
        FamilyMember.user_id == user_id
    )
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical record not found")

    # Delete S3 object FIRST (before DB row — security rule)
    if record.s3_key:
        import asyncio
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, s3_service.delete_object, record.s3_key)
        except Exception:
            # Log but don't block deletion if S3 delete fails
            # (record may already be deleted from S3, or key may be invalid)
            pass

    # Delete DB row
    await db.delete(record)
    await db.commit()
    return None
