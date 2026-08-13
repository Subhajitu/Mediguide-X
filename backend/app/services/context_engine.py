from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
import datetime
import uuid

# Import models
from app.db.models.family_member import FamilyMember
from app.db.models.medical_record import MedicalRecord
from app.db.models.medication import Medication
from app.db.models.consultation import Consultation
from app.db.models.chat_message import ChatMessage

def calculate_age(dob: datetime.date) -> int:
    today = datetime.date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

class ContextEngine:
    async def build_patient_context(self, db: AsyncSession, family_member_id: uuid.UUID, consultation_id: uuid.UUID = None) -> str:
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
        
        # Format active conditions and allergies
        conditions = ", ".join(member.medical_conditions) if member.medical_conditions else "None reported"
        allergies = ", ".join(member.allergies) if member.allergies else "None known"

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
            # We want a very short summary
            line = f"  - {r.title} ({r.record_date}): "
            if r.extracted_data:
                # E.g. {"Hb": "11.2 g/dL (Low)"}
                ext = ", ".join([f"{k}: {v}" for k, v in r.extracted_data.items()][:5]) # limit to 5
                line += ext
            elif r.summary:
                line += r.summary[:100] + "..."
            else:
                line += "No summary available."
            records_text_lines.append(line)
            
        records_str = "\n".join(records_text_lines) if records_text_lines else "  - No recent records."

        # 4. Fetch recent dialogue (if consultation_id is provided)
        dialogue_str = "  - No recent dialogue."
        if consultation_id:
            stmt_chat = select(ChatMessage).where(
                ChatMessage.consultation_id == consultation_id
            ).order_by(desc(ChatMessage.timestamp)).limit(6)  # Last 3 turns (user+ai pairs)
            result_chat = await db.execute(stmt_chat)
            chat_messages = list(result_chat.scalars().all())
            chat_messages.reverse() # chronological order
            
            if chat_messages:
                dialogue_lines = []
                for msg in chat_messages:
                    sender_str = "User" if msg.sender.value == "user" else "AI"
                    dialogue_lines.append(f"  {sender_str}: {msg.text}")
                dialogue_str = "\n".join(dialogue_lines)

        # 5. Assemble final string
        context_string = f"""[PATIENT CONTEXT]
Patient: {member.name} ({gender_str}, Age: {age}) | Blood Group: {member.blood_group or 'Unknown'}
Active Conditions: {conditions}
Allergies: {allergies}
Current Medications: {meds_str}
Recent Labs/Records:
{records_str}
Recent Dialogue:
{dialogue_str}
"""
        return context_string

context_engine = ContextEngine()
