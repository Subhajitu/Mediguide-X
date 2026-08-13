import uuid
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class RecordTypeEnum(str, enum.Enum):
    lab_report = "lab_report"
    prescription = "prescription"
    vitals_summary = "vitals_summary"
    other = "other"

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_member_id = Column(UUID(as_uuid=True), ForeignKey("family_members.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    record_type = Column(SQLEnum(RecordTypeEnum), nullable=False)
    s3_key = Column(String(512), nullable=True)
    summary = Column(Text, nullable=True)
    extracted_data = Column(JSONB, nullable=True)
    record_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
