"""
Tests for Task 22: AI-Generated Contextual Suggestions.

Verifies:
1. _parse_suggestions correctly splits text and suggestion lines
2. _parse_suggestions handles missing SUGGESTIONS marker (fallback)
3. _parse_suggestions trims to 3 suggestions, pads to 3 if short
4. Suggestions returned in API response come from AI (not hardcoded)
5. Clean AI text (SUGGESTIONS block stripped) is saved to DB
6. Clean AI text is returned in ai_message field
"""
import pytest
import uuid
import datetime
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from httpx import AsyncClient

from app.db.models.user import User
from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum
from app.db.models.chat_message import ChatMessage, SenderEnum
from app.services.bedrock import BedrockService


# ---------------------------------------------------------------------------
# Unit tests: BedrockService._parse_suggestions
# ---------------------------------------------------------------------------

class TestParseSuggestions:

    def test_well_formed_response_split_correctly(self):
        raw = (
            "Here is some medical information about headaches.\n\n"
            "SUGGESTIONS:\n"
            "- What are the common causes of migraines?\n"
            "- When should I see a doctor for a headache?\n"
            "- What pain relief options are safe during pregnancy?"
        )
        text, suggestions = BedrockService._parse_suggestions(raw)
        assert text == "Here is some medical information about headaches."
        assert len(suggestions) == 3
        assert suggestions[0] == "What are the common causes of migraines?"
        assert suggestions[1] == "When should I see a doctor for a headache?"
        assert suggestions[2] == "What pain relief options are safe during pregnancy?"

    def test_suggestions_block_absent_from_clean_text(self):
        raw = "AI response.\n\nSUGGESTIONS:\n- Q1?\n- Q2?\n- Q3?"
        text, _ = BedrockService._parse_suggestions(raw)
        assert "SUGGESTIONS" not in text
        assert "Q1" not in text

    def test_missing_marker_returns_full_text_and_fallback(self):
        raw = "Here is a response with no suggestions marker."
        text, suggestions = BedrockService._parse_suggestions(raw)
        assert text == raw.strip()
        assert len(suggestions) == 3
        assert all(isinstance(s, str) and len(s) > 0 for s in suggestions)

    def test_empty_suggestions_block_returns_fallback(self):
        raw = "Response text.\n\nSUGGESTIONS:\n"
        text, suggestions = BedrockService._parse_suggestions(raw)
        assert text == "Response text."
        assert len(suggestions) == 3

    def test_extra_suggestions_trimmed_to_three(self):
        raw = (
            "Response.\n\nSUGGESTIONS:\n"
            "- Q1?\n- Q2?\n- Q3?\n- Q4?\n- Q5?"
        )
        _, suggestions = BedrockService._parse_suggestions(raw)
        assert len(suggestions) == 3

    def test_single_suggestion_padded_to_three(self):
        raw = "Response.\n\nSUGGESTIONS:\n- Only one question?"
        _, suggestions = BedrockService._parse_suggestions(raw)
        assert len(suggestions) == 3
        assert suggestions[0] == "Only one question?"
        assert all(len(s) > 0 for s in suggestions)

    def test_clean_text_is_stripped_of_whitespace(self):
        raw = "  Response with trailing space.  \n\nSUGGESTIONS:\n- Q1?\n- Q2?\n- Q3?"
        text, _ = BedrockService._parse_suggestions(raw)
        assert text == "Response with trailing space."

    def test_suggestion_lines_stripped_of_whitespace(self):
        raw = "Response.\n\nSUGGESTIONS:\n-   Spaced question?   \n- Q2?\n- Q3?"
        _, suggestions = BedrockService._parse_suggestions(raw)
        assert suggestions[0] == "Spaced question?"

    def test_lines_without_dash_prefix_ignored(self):
        raw = "Response.\n\nSUGGESTIONS:\nNot a suggestion\n- Q1?\n- Q2?\n- Q3?"
        _, suggestions = BedrockService._parse_suggestions(raw)
        assert len(suggestions) == 3
        assert "Not a suggestion" not in suggestions
        assert suggestions[0] == "Q1?"

    def test_marker_inline_with_text_splits_correctly(self):
        raw = "First part. SUGGESTIONS:\n- Q1?\n- Q2?\n- Q3?"
        text, suggestions = BedrockService._parse_suggestions(raw)
        assert "First part." in text
        assert len(suggestions) == 3

    def test_two_suggestions_padded_to_three(self):
        raw = "Response.\n\nSUGGESTIONS:\n- Q1?\n- Q2?"
        _, suggestions = BedrockService._parse_suggestions(raw)
        assert len(suggestions) == 3
        assert suggestions[0] == "Q1?"
        assert suggestions[1] == "Q2?"
        # Third is a fallback — must be a non-empty string
        assert len(suggestions[2]) > 0

    def test_never_raises_on_malformed_input(self):
        malformed_cases = [
            "",
            "SUGGESTIONS:",
            "SUGGESTIONS:\n",
            "SUGGESTIONS:\n-",
            "SUGGESTIONS:\n- ",
        ]
        for case in malformed_cases:
            text, suggestions = BedrockService._parse_suggestions(case)
            assert isinstance(text, str)
            assert isinstance(suggestions, list)
            assert len(suggestions) == 3


# ---------------------------------------------------------------------------
# Integration tests: suggestions wired through the API endpoint
# ---------------------------------------------------------------------------

class TestSuggestionsInApiResponse:

    MOCK_TOKEN = "Bearer mock-token-suggestions@test.com"

    async def _setup(self, db_session: AsyncSession):
        user = User(
            id=uuid.uuid4(),
            cognito_sub="00000000-0000-0000-0000-000000000000",
            email="suggestions@test.com",
            full_name="Suggestions Test User",
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
        return member

    async def test_ai_generated_suggestions_returned_in_response(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Suggestions from the AI tuple are returned, not a hardcoded list."""
        member = await self._setup(db_session)

        ai_suggestions = [
            "What medications are commonly prescribed for migraines?",
            "How long do migraines typically last?",
            "Are there dietary triggers for migraines?",
        ]

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Migraines are severe headaches.", ai_suggestions),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "I have a severe headache on one side"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["suggestions"] == ai_suggestions
        assert data["ai_message"] == "Migraines are severe headaches."

    async def test_clean_text_returned_in_ai_message(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """ai_message must not contain the SUGGESTIONS block."""
        member = await self._setup(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Clean response text only.", ["Q1?", "Q2?", "Q3?"]),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "Tell me about fever symptoms"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert "SUGGESTIONS" not in data["ai_message"]
        assert data["ai_message"] == "Clean response text only."

    async def test_suggestions_always_list_of_three_strings(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """suggestions field is always a list of exactly 3 non-empty strings."""
        member = await self._setup(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Response.", ["Suggestion A?", "Suggestion B?", "Suggestion C?"]),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "What are hypertension symptoms?"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200
        suggestions = resp.json()["suggestions"]
        assert isinstance(suggestions, list)
        assert len(suggestions) == 3
        assert all(isinstance(s, str) and len(s) > 0 for s in suggestions)

    async def test_guardrail_response_has_suggestions(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Guardrail bypass still returns a non-empty suggestions list."""
        member = await self._setup(db_session)

        resp = await client.post(
            f"/api/v1/consultations/{member.id}/messages",
            json={"message": "Who won the football match?"},
            headers={"Authorization": self.MOCK_TOKEN},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) > 0

    async def test_clean_text_saved_to_database(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """ChatMessage stored in DB must not contain the SUGGESTIONS block."""
        member = await self._setup(db_session)

        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Stored clean text.", ["Q1?", "Q2?", "Q3?"]),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "What are the signs of anemia?"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )

        assert resp.status_code == 200

        stmt = select(ChatMessage).where(ChatMessage.sender == SenderEnum.ai)
        result = await db_session.execute(stmt)
        ai_messages = result.scalars().all()

        assert len(ai_messages) == 1
        assert ai_messages[0].text == "Stored clean text."
        assert "SUGGESTIONS" not in ai_messages[0].text

    async def test_different_suggestions_per_response(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Two different AI responses return two different suggestion sets."""
        member = await self._setup(db_session)

        suggestions_turn1 = ["What causes migraines?", "Any home remedies?", "See a doctor?"]
        suggestions_turn2 = ["How long does flu last?", "Is it contagious?", "When to go to ER?"]

        # Turn 1
        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Migraine info.", suggestions_turn1),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp1 = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "I have a headache"},
                    headers={"Authorization": self.MOCK_TOKEN},
                )
        assert resp1.json()["suggestions"] == suggestions_turn1
        consultation_id = resp1.json()["consultation_id"]

        # Turn 2
        with patch(
            "app.api.v1.endpoints.consultations.bedrock_service.invoke_nova_lite_chat_with_history",
            new_callable=AsyncMock,
            return_value=("Flu info.", suggestions_turn2),
        ):
            with patch(
                "app.api.v1.endpoints.consultations.context_engine.build_patient_context",
                new_callable=AsyncMock,
                return_value="[PATIENT CONTEXT]",
            ):
                resp2 = await client.post(
                    f"/api/v1/consultations/{member.id}/messages",
                    json={"message": "Now I have a fever", "consultation_id": consultation_id},
                    headers={"Authorization": self.MOCK_TOKEN},
                )
        assert resp2.json()["suggestions"] == suggestions_turn2
        # Suggestions must differ between turns
        assert resp1.json()["suggestions"] != resp2.json()["suggestions"]
