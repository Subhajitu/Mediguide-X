"""
Tests for Task 17: Document-in-chat backend.

Verifies:
1. Messages without documents use Nova Lite (invoke_nova_lite_chat_with_history)
2. Messages with a document_s3_key use Nova Pro (invoke_nova_pro_with_document)
3. Document ownership is validated — cannot use another user's document
4. ChatMessage row stores document_s3_key when present
5. The Alembic migration column exists on the model
"""
import pytest
import uuid
import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from httpx import AsyncClient

from app.db.models.user import User
from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum
from app.db.models.medical_record import MedicalRecord, RecordTypeEnum
from app.db.models.chat_message import ChatMessage, SenderEnum


async def create_user_member_record(db: AsyncSession, email: str = "doctest@test.com"):
    """Create a full user → family_member → medical_record chain."""
    user = User(
        id=uuid.uuid4(),
        cognito_sub="00000000-0000-0000-0000-000000000000",
        email=email,
        full_name="Doc Test User",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    member = FamilyMember(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Test Member",
        relationship=RelationshipEnum.self,
        date_of_birth=datetime.date(1990, 1, 1),
        gender=GenderEnum.other,
        medical_conditions=[],
        allergies=[],
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    record = MedicalRecord(
        id=uuid.uuid4(),
        family_member_id=member.id,
        title="Blood Test",
        record_type=RecordTypeEnum.lab_report,
        s3_key=f"patients/{member.id}/reports/test.pdf",
        record_date=datetime.date.today(),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return user, member, record


MOCK_TOKEN = "Bearer mock-token-doctest@test.com"
MOCK_DOCS_BYTES = b"%PDF-1.4 fake pdf content"


class TestDocumentInChat:

    async def test_message_without_document_uses_nova_lite(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        _, member, _ = await create_user_member_record(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Nova Lite response.", ["Q1?", "Q2?", "Q3?"]),
        ) as mock_lite:
            with patch(
                "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_pro_with_document",
                new_callable=AsyncMock,
            ) as mock_pro:
                with patch(
                    "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                    new_callable=AsyncMock, return_value="[PATIENT CONTEXT]"
                ):
                    resp = await client.post(
                        f"/api/v1/consultations/{member.id}/messages",
                        json={"message": "I have a headache"},
                        headers={"Authorization": MOCK_TOKEN},
                    )

        assert resp.status_code == 200
        mock_lite.assert_called_once()
        mock_pro.assert_not_called()

    async def test_message_with_document_uses_nova_pro(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        _, member, record = await create_user_member_record(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_pro_with_document",
            new_callable=AsyncMock,
            return_value=("Nova Pro document analysis.", ["Q1?", "Q2?", "Q3?"]),
        ) as mock_pro:
            with patch(
                "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
                new_callable=AsyncMock,
            ) as mock_lite:
                with patch(
                    "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                    new_callable=AsyncMock, return_value="[PATIENT CONTEXT]"
                ):
                    with patch(
                        "app.api.v1.endpoints.consultations.s3_service._get_object_bytes",
                        return_value=MOCK_DOCS_BYTES
                    ):
                        resp = await client.post(
                            f"/api/v1/consultations/{member.id}/messages",
                            json={
                                "message": "Please analyze this report",
                                "document_s3_key": record.s3_key,
                            },
                            headers={"Authorization": MOCK_TOKEN},
                        )

        assert resp.status_code == 200
        assert resp.json()["ai_message"] == "Nova Pro document analysis."
        mock_pro.assert_called_once()
        mock_lite.assert_not_called()

    async def test_document_ownership_enforced(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Cannot attach another user's document to a message."""
        # user_a owns member_a — authenticated user via mock token
        user_a = User(
            id=uuid.uuid4(), cognito_sub="00000000-0000-0000-0000-000000000000",
            email="doctest@test.com", full_name="User A"
        )
        db_session.add(user_a)

        # user_b has their own member + record
        user_b = User(
            id=uuid.uuid4(), cognito_sub="bbbb-0000-user-b",
            email="userb-doc@test.com", full_name="User B"
        )
        db_session.add(user_b)
        await db_session.commit()

        member_a = FamilyMember(
            id=uuid.uuid4(), user_id=user_a.id, name="A Member",
            relationship=RelationshipEnum.self,
            date_of_birth=datetime.date(1990, 1, 1), gender=GenderEnum.other,
            medical_conditions=[], allergies=[],
        )
        member_b = FamilyMember(
            id=uuid.uuid4(), user_id=user_b.id, name="B Member",
            relationship=RelationshipEnum.self,
            date_of_birth=datetime.date(1990, 1, 1), gender=GenderEnum.other,
            medical_conditions=[], allergies=[],
        )
        db_session.add(member_a)
        db_session.add(member_b)
        await db_session.commit()

        record_b = MedicalRecord(
            id=uuid.uuid4(), family_member_id=member_b.id,
            title="B Report", record_type=RecordTypeEnum.lab_report,
            s3_key=f"patients/{member_b.id}/reports/secret.pdf",
            record_date=datetime.date.today(),
        )
        db_session.add(record_b)
        await db_session.commit()

        # user_a tries to attach user_b's document
        with patch(
            "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
            new_callable=AsyncMock, return_value="[PATIENT CONTEXT]"
        ):
            resp = await client.post(
                f"/api/v1/consultations/{member_a.id}/messages",
                json={
                    "message": "Analyze this",
                    "document_s3_key": record_b.s3_key,
                },
                headers={"Authorization": MOCK_TOKEN},
            )
        assert resp.status_code == 403

    async def test_document_s3_key_stored_in_chat_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """When a document is attached, document_s3_key is stored on the ChatMessage row."""
        _, member, record = await create_user_member_record(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_pro_with_document",
            new_callable=AsyncMock,
            return_value=("Analysis result.", ["Q1?", "Q2?", "Q3?"]),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock, return_value="[PATIENT CONTEXT]"
            ):
                with patch(
                    "app.api.v1.endpoints.consultations.s3_service._get_object_bytes",
                    return_value=MOCK_DOCS_BYTES
                ):
                    resp = await client.post(
                        f"/api/v1/consultations/{member.id}/messages",
                        json={
                            "message": "Check this lab result",
                            "document_s3_key": record.s3_key,
                        },
                        headers={"Authorization": MOCK_TOKEN},
                    )

        assert resp.status_code == 200

        stmt = select(ChatMessage).where(
            ChatMessage.sender == SenderEnum.user,
            ChatMessage.document_s3_key == record.s3_key
        )
        result = await db_session.execute(stmt)
        msg = result.scalar_one_or_none()
        assert msg is not None
        assert msg.document_s3_key == record.s3_key

    async def test_chat_message_model_has_document_s3_key_column(self):
        """The ChatMessage model has a document_s3_key attribute."""
        from app.db.models.chat_message import ChatMessage
        msg = ChatMessage()
        assert hasattr(msg, 'document_s3_key')
