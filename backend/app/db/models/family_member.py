import uuid
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class RelationshipEnum(str, enum.Enum):
    self = "self"
    spouse = "spouse"
    child = "child"
    parent = "parent"
    sibling = "sibling"
    other = "other"

class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class FamilyMember(Base):
    __tablename__ = "family_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    relationship = Column(SQLEnum(RelationshipEnum), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(SQLEnum(GenderEnum), nullable=False)
    blood_group = Column(String(10), nullable=True)
    medical_conditions = Column(JSONB, nullable=True) # List of strings
    allergies = Column(JSONB, nullable=True)          # List of strings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
