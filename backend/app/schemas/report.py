from pydantic import BaseModel, Field
from uuid import UUID
from typing import Literal, Optional, List
from datetime import date

class ReportUploadUrlRequest(BaseModel):
    family_member_id: UUID
    title: str = Field(..., min_length=3, max_length=150)
    filename: str = Field(..., pattern=r"^[\w\-. ]+\.(pdf|png|jpg|jpeg)$")
    content_type: str = Field(..., pattern=r"^(application/pdf|image/png|image/jpeg)$")
    record_type: Literal["lab_report", "prescription", "vitals_summary", "other"]
    record_date: date

class ReportUploadUrlResponse(BaseModel):
    record_id: UUID
    s3_key: str
    upload_url: str
    expires_in_seconds: int = 900

class MedicalRecordItem(BaseModel):
    id: UUID
    title: str
    record_type: str
    record_date: date
    summary: Optional[str]
    download_url: str

class ReportListResponse(BaseModel):
    records: List[MedicalRecordItem]
