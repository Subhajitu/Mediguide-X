from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, asc
import datetime
import uuid

# Import models
from app.db.models.family_member import FamilyMember
from app.db.models.medical_record import MedicalRecord
from app.db.models.medication import Medication
from app.db.models.chat_message import ChatMessage, SenderEnum
from app.core.sanitizer import sanitize_document_content

def calculate_age(dob: datetime.date) -> int:
    today = datetime.date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

class ContextEngine:
    def _read_extracted_params(self, data) -> list:
        """
        Normalises extracted_data to a list of parameter dicts.

        Handles two on-disk formats:
          - Old format (pre-Task 1): {"parameters": [...]}
          - New format (post-Task 1): [{"name": ..., "value": ..., "unit": ..., "is_out_of_range": bool}, ...]
        Returns [] for None or any unexpected type.
        """
        if isinstance(data, dict):
            return data.get("parameters", [])
        if isinstance(data, list):
            return data
        return []

    async def build_patient_context(self, db: AsyncSession, family_member_id: uuid.UUID) -> str:
        """
        Builds the compressed RAG context string for a specific patient.
        Returns a string < 800 tokens describing the patient's current clinical state.
        """
        # 1. Fetch Patient Profile
        stmt_member = select(FamilyMember).where(FamilyMember.id == family_member_id)
        result_member = await db.execute(stmt_member)
        member = result_member.scalar_one_or_none()

        if not member:
            return "[PATIENT CONTEXT] Error: Patient profile not found."

        age = calculate_age(member.date_of_birth)
        gender_str = member.gender.value.capitalize() if hasattr(member.gender, 'value') else str(member.gender).capitalize()

        # Sanitize user-supplied name before including in context
        safe_name = sanitize_document_content(member.name, max_length=100)

        # Format active conditions and allergies, sanitized against injection
        conditions_raw = ", ".join(member.medical_conditions) if member.medical_conditions else "None reported"
        allergies_raw = ", ".join(member.allergies) if member.allergies else "None known"
        conditions = sanitize_document_content(conditions_raw, max_length=500)
        allergies = sanitize_document_content(allergies_raw, max_length=500)

        # 2. Fetch Active Medications
        stmt_meds = select(Medication).where(
            Medication.family_member_id == family_member_id,
            Medication.is_active == True
        )
        result_meds = await db.execute(stmt_meds)
        active_meds = result_meds.scalars().all()
        meds_str = ", ".join([f"{m.name} {m.dosage} ({m.frequency})" for m in active_meds]) if active_meds else "None"

        # 3. Fetch latest 3 Medical Records
        stmt_records = select(MedicalRecord).where(
            MedicalRecord.family_member_id == family_member_id
        ).order_by(desc(MedicalRecord.record_date)).limit(3)
        result_records = await db.execute(stmt_records)
        records = result_records.scalars().all()

        records_text_lines = []
        for r in records:
            line = f"  - {r.title} ({r.record_date}): "
            if r.extracted_data:
                params = self._read_extracted_params(r.extracted_data)
                param_parts = []
                for p in params[:5]:  # limit to 5 parameters per record
                    name = p.get("name", "")
                    value = p.get("value", "")
                    unit = p.get("unit", "")
                    out_of_range = p.get("is_out_of_range", False)
                    entry = f"{name}: {value} {unit}".strip()
                    if out_of_range:
                        entry += " \u26a0"  # ⚠ warning marker
                    param_parts.append(entry)
                if param_parts:
                    line += ", ".join(param_parts)
                elif r.summary:
                    safe_summary = sanitize_document_content(r.summary, max_length=200)
                    line += safe_summary[:100] + ("..." if len(safe_summary) > 100 else "")
                else:
                    line += "No summary available."
            elif r.summary:
                safe_summary = sanitize_document_content(r.summary, max_length=200)
                line += safe_summary[:100] + ("..." if len(safe_summary) > 100 else "")
            else:
                line += "No summary available."
            records_text_lines.append(line)

        records_str = "\n".join(records_text_lines) if records_text_lines else "  - No recent records."

        # 4. Assemble final string
        context_string = f"""[PATIENT CONTEXT]
Patient: {safe_name} ({gender_str}, Age: {age}) | Blood Group: {member.blood_group or 'Unknown'}
Active Conditions: {conditions}
Allergies: {allergies}
Current Medications: {meds_str}
Recent Labs/Records:
{records_str}
"""
        return context_string

    async def get_conversation_history(
        self,
        db: AsyncSession,
        consultation_id: uuid.UUID,
        history_turns: int = 3,
    ) -> list[dict]:
        """
        Fetches the last `history_turns` complete user/assistant pairs from the
        consultation and returns them as a Bedrock Converse API messages list:
          [{"role": "user", "content": [{"text": "..."}]},
           {"role": "assistant", "content": [{"text": "..."}]}, ...]

        Ordering: chronological (oldest first) — Bedrock requires alternating
        user/assistant roles starting and ending correctly.

        Caps at history_turns * 2 messages (pairs). If the stored history has an
        odd number (e.g. the very first user message is uncommitted mid-flight),
        strips the trailing unpaired message so the array always alternates cleanly.
        """
        max_messages = history_turns * 2

        stmt = (
            select(ChatMessage)
            .where(ChatMessage.consultation_id == consultation_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(max_messages)
        )
        result = await db.execute(stmt)
        # desc() gives newest-first; reverse to get chronological order
        messages_desc = result.scalars().all()
        messages_chron = list(reversed(messages_desc))

        bedrock_messages = []
        for msg in messages_chron:
            role = "user" if msg.sender == SenderEnum.user else "assistant"
            bedrock_messages.append({
                "role": role,
                "content": [{"text": msg.text}],
            })

        # Ensure alternating roles — strip leading assistant messages if any,
        # then strip a trailing unpaired user message if history is odd-length.
        # Bedrock requires: first message must be "user", must alternate, last can be either.
        while bedrock_messages and bedrock_messages[0]["role"] != "user":
            bedrock_messages.pop(0)

        # If we end up with an odd number, the last entry is an orphaned message
        # (shouldn't happen in normal flow, but guard against it)
        if len(bedrock_messages) % 2 != 0 and len(bedrock_messages) > 0:
            bedrock_messages.pop()  # remove orphaned last message

        return bedrock_messages

context_engine = ContextEngine()
