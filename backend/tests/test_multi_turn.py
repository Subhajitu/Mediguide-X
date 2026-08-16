"""
Tests for Task 19: Multi-turn conversation history via Bedrock Converse API.

Verifies:
1. get_conversation_history returns messages in chronological order
2. History is capped at AI_HISTORY_TURNS * 2 messages
3. Orphaned messages are trimmed (even-length guarantee)
4. First-turn call (empty history) works correctly
5. Subsequent turns pass history to invoke_nova_lite_chat_with_history
6. History is fetched BEFORE the current user message is saved (not included in its own history)
"""
import pytest
import uuid
import datetime
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.db.models.user import User
from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum
from app.db.models.consultation import Consultation
from app.db.models.chat_message import ChatMessage, SenderEnum
from app.services.context_engine import ContextEngine


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

async def create_user(db: AsyncSession, email: str = "multiturn@test.com") -> User:
    user = User(
        id=uuid.uuid4(),
        cognito_sub="00000000-0000-0000-0000-000000000000",
        email=email,
        full_name="Multi Turn User",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_family_member(db: AsyncSession, user_id: uuid.UUID) -> FamilyMember:
    member = FamilyMember(
        id=uuid.uuid4(),
        user_id=user_id,
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
    return member


async def create_consultation(db: AsyncSession, family_member_id: uuid.UUID) -> Consultation:
    c = Consultation(
        id=uuid.uuid4(),
        family_member_id=family_member_id,
        title="Multi-turn test consultation",
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


async def add_message(
    db: AsyncSession,
    consultation_id: uuid.UUID,
    sender: SenderEnum,
    text: str,
    offset_seconds: int = 0,
) -> ChatMessage:
    """Insert a chat message with a controllable timestamp for ordering tests."""
    msg = ChatMessage(
        id=uuid.uuid4(),
        consultation_id=consultation_id,
        sender=sender,
        text=text,
        timestamp=datetime.datetime(2024, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)
        + datetime.timedelta(seconds=offset_seconds),
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# ---------------------------------------------------------------------------
# Unit tests: ContextEngine.get_conversation_history
# ---------------------------------------------------------------------------

class TestGetConversationHistory:

    async def test_empty_consultation_returns_empty_list(self, db_session: AsyncSession):
        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, uuid.uuid4())
        assert result == []

    async def test_single_complete_pair_returned(self, db_session: AsyncSession):
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        await add_message(db_session, consultation.id, SenderEnum.user, "Hello", offset_seconds=0)
        await add_message(db_session, consultation.id, SenderEnum.ai, "Hi there", offset_seconds=1)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id)

        assert len(result) == 2
        assert result[0]["role"] == "user"
        assert result[0]["content"][0]["text"] == "Hello"
        assert result[1]["role"] == "assistant"
        assert result[1]["content"][0]["text"] == "Hi there"

    async def test_history_capped_at_history_turns_pairs(self, db_session: AsyncSession):
        """With history_turns=2, only the last 2 pairs (4 messages) are returned."""
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        # Add 3 complete pairs (6 messages)
        for i in range(3):
            await add_message(db_session, consultation.id, SenderEnum.user, f"User msg {i}", offset_seconds=i * 2)
            await add_message(db_session, consultation.id, SenderEnum.ai, f"AI msg {i}", offset_seconds=i * 2 + 1)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id, history_turns=2)

        # Should return last 2 pairs = 4 messages
        assert len(result) == 4
        assert result[0]["content"][0]["text"] == "User msg 1"
        assert result[1]["content"][0]["text"] == "AI msg 1"
        assert result[2]["content"][0]["text"] == "User msg 2"
        assert result[3]["content"][0]["text"] == "AI msg 2"

    async def test_orphaned_trailing_user_message_is_stripped(self, db_session: AsyncSession):
        """If the last message is an orphaned user message (no AI reply yet), it's stripped."""
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        # 1 complete pair + 1 orphaned user message
        await add_message(db_session, consultation.id, SenderEnum.user, "First question", offset_seconds=0)
        await add_message(db_session, consultation.id, SenderEnum.ai, "First answer", offset_seconds=1)
        await add_message(db_session, consultation.id, SenderEnum.user, "Orphaned question", offset_seconds=2)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id, history_turns=3)

        # The orphaned user message (odd count = 3) must be stripped → 2 messages remain
        assert len(result) == 2
        assert result[0]["role"] == "user"
        assert result[0]["content"][0]["text"] == "First question"
        assert result[1]["role"] == "assistant"

    async def test_messages_in_chronological_order(self, db_session: AsyncSession):
        """History must be oldest-first for Bedrock's alternating message requirement."""
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        await add_message(db_session, consultation.id, SenderEnum.user, "Turn 1 user", offset_seconds=0)
        await add_message(db_session, consultation.id, SenderEnum.ai, "Turn 1 ai", offset_seconds=1)
        await add_message(db_session, consultation.id, SenderEnum.user, "Turn 2 user", offset_seconds=2)
        await add_message(db_session, consultation.id, SenderEnum.ai, "Turn 2 ai", offset_seconds=3)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id)

        texts = [m["content"][0]["text"] for m in result]
        assert texts == ["Turn 1 user", "Turn 1 ai", "Turn 2 user", "Turn 2 ai"]

    async def test_default_history_turns_caps_at_six_messages(self, db_session: AsyncSession):
        """Default history_turns=3 → at most 6 messages returned."""
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        # Add 5 complete pairs (10 messages total)
        for i in range(5):
            await add_message(db_session, consultation.id, SenderEnum.user, f"u{i}", offset_seconds=i * 2)
            await add_message(db_session, consultation.id, SenderEnum.ai, f"a{i}", offset_seconds=i * 2 + 1)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id, history_turns=3)

        assert len(result) == 6  # 3 pairs × 2 = 6

    async def test_bedrock_message_format(self, db_session: AsyncSession):
        """Each returned dict has 'role' and 'content' with list of {'text': ...}."""
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        await add_message(db_session, consultation.id, SenderEnum.user, "Test input", offset_seconds=0)
        await add_message(db_session, consultation.id, SenderEnum.ai, "Test reply", offset_seconds=1)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id)

        for msg in result:
            assert "role" in msg
            assert msg["role"] in ("user", "assistant")
            assert "content" in msg
            assert isinstance(msg["content"], list)
            assert len(msg["content"]) == 1
            assert "text" in msg["content"][0]
            assert isinstance(msg["content"][0]["text"], str)

    async def test_ai_sender_maps_to_assistant_role(self, db_session: AsyncSession):
        """SenderEnum.ai must map to 'assistant' role (Bedrock requires this exact string)."""
        user = await create_user(db_session)
        member = await create_family_member(db_session, user.id)
        consultation = await create_consultation(db_session, member.id)

        await add_message(db_session, consultation.id, SenderEnum.user, "question", offset_seconds=0)
        await add_message(db_session, consultation.id, SenderEnum.ai, "answer", offset_seconds=1)

        engine = ContextEngine()
        result = await engine.get_conversation_history(db_session, consultation.id)

        roles = [m["role"] for m in result]
        assert roles == ["user", "assistant"]


# ---------------------------------------------------------------------------
# Integration tests: send_chat_message endpoint wiring
# ---------------------------------------------------------------------------

class TestMultiTurnEndpointWiring:
    """
    Verify that the send_chat_message endpoint:
    1. Calls invoke_nova_lite_chat_with_history (not the single-turn version)
    2. Passes history fetched BEFORE the current message
    3. On the first turn, history is empty
    4. On subsequent turns, history contains prior pairs
    """

    MOCK_TOKEN = "Bearer mock-token-multiturn@test.com"

    async def _setup_user_and_member(self, db_session: AsyncSession):
        user = User(
            id=uuid.uuid4(),
            cognito_sub="00000000-0000-0000-0000-000000000000",
            email="multiturn@test.com",
            full_name="Multi Turn User",
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

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
        db_session.add(member)
        await db_session.commit()
        await db_session.refresh(member)
        return user, member

    async def test_first_turn_calls_with_empty_history(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """On the very first message of a consultation, history must be []."""
        _, member = await self._setup_user_and_member(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("AI first turn response", ["Q1?", "Q2?", "Q3?"]),
        ) as mock_ai:
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]\nTest patient",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "I have a headache and fever"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200
        assert resp.json()["ai_message"] == "AI first turn response"

        mock_ai.assert_called_once()
        # Signature: invoke_nova_lite_chat_with_history(patient_context, history, user_message)
        call_args = mock_ai.call_args
        history_arg = call_args.args[1]
        assert history_arg == []

    async def test_second_turn_passes_first_turn_as_history(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """On turn 2, history contains the first user/assistant pair."""
        _, member = await self._setup_user_and_member(db_session)

        # --- First turn ---
        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("First AI response", ["Q1?", "Q2?", "Q3?"]),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]\nTest patient",
            ):
                first_resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "I have a headache and fever"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )
        assert first_resp.status_code == 200
        consultation_id = first_resp.json()["consultation_id"]

        # --- Second turn ---
        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Second AI response", ["Q1?", "Q2?", "Q3?"]),
        ) as mock_ai_turn2:
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]\nTest patient",
            ):
                second_resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={
                        "message": "What medicine should I take?",
                        "consultation_id": consultation_id,
                    },
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert second_resp.status_code == 200
        assert second_resp.json()["ai_message"] == "Second AI response"

        mock_ai_turn2.assert_called_once()
        call_args = mock_ai_turn2.call_args
        # args: (patient_context, history, user_message)
        history_arg = call_args.args[1]
        assert len(history_arg) == 2  # 1 user + 1 assistant = 1 complete pair
        assert history_arg[0]["role"] == "user"
        assert history_arg[0]["content"][0]["text"] == "I have a headache and fever"
        assert history_arg[1]["role"] == "assistant"
        assert history_arg[1]["content"][0]["text"] == "First AI response"

    async def test_current_message_not_in_history(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """The message being sent must not appear in its own history argument."""
        _, member = await self._setup_user_and_member(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Response", ["Q1?", "Q2?", "Q3?"]),
        ) as mock_ai:
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "Do I have diabetes symptoms?"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200
        call_args = mock_ai.call_args
        history_arg = call_args.args[1]
        all_texts = [m["content"][0]["text"] for m in history_arg]
        assert "Do I have diabetes symptoms?" not in all_texts

    async def test_guardrail_bypass_does_not_call_bedrock(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Non-medical query triggers guardrail and must NOT call invoke_nova_lite_chat_with_history."""
        _, member = await self._setup_user_and_member(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
        ) as mock_ai:
            # Use explicit non-medical keyword from the guardrail blocklist
            resp = await client.post(
                f"/api/v1/consultations/{member.id}/messages",
                json={"message": "What is a good recipe for cooking pasta?"},
                headers={"Authorization": self.MOCK_TOKEN},
            )

        # Guardrail short-circuits and returns 200 with a redirect message
        assert resp.status_code == 200
        # Bedrock must NOT have been called
        mock_ai.assert_not_called()

    async def test_response_schema_includes_consultation_id(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Response includes a consultation_id that can be used for subsequent turns."""
        _, member = await self._setup_user_and_member(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("AI response", ["Q1?", "Q2?", "Q3?"]),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "I feel chest pain and shortness of breath"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert "consultation_id" in data
        assert data["consultation_id"] is not None
        # Should be a valid UUID string
        uuid.UUID(str(data["consultation_id"]))
