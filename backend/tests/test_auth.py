"""
Auth endpoint smoke tests.
Tests for GET /auth/me and PUT /auth/me.
"""
import pytest
import uuid
import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum

MOCK_COGNITO_SUB = "00000000-0000-0000-0000-000000000000"
MOCK_TOKEN = "Bearer mock-token-test@example.com"


async def create_test_user(db: AsyncSession, email: str = "test@example.com", full_name: str = "Test User") -> User:
    """Helper: insert a user that the mock token resolves to."""
    user = User(
        id=uuid.uuid4(),
        cognito_sub=MOCK_COGNITO_SUB,
        email=email,
        full_name=full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestGetMe:
    async def test_get_me_returns_profile(self, client: AsyncClient, db_session: AsyncSession):
        """GET /auth/me returns user profile with correct fields."""
        await create_test_user(db_session, email="test@example.com", full_name="Test User")

        response = await client.get("/api/v1/auth/me", headers={"Authorization": MOCK_TOKEN})

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert "id" in data
        assert "created_at" in data

    async def test_get_me_no_token_returns_4xx(self, client: AsyncClient):
        """GET /auth/me without a token returns 401 or 403 (HTTPBearer raises 403 for missing header)."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in (401, 403)

    async def test_family_members_count_is_real(self, client: AsyncClient, db_session: AsyncSession):
        """GET /auth/me returns the real family_members_count, not hardcoded 0."""
        user = await create_test_user(db_session)

        # Add two family members
        for i in range(2):
            member = FamilyMember(
                id=uuid.uuid4(),
                user_id=user.id,
                name=f"Member {i}",
                relationship=RelationshipEnum.child,
                date_of_birth=datetime.date(2010, 1, 1),
                gender=GenderEnum.other,
            )
            db_session.add(member)
        await db_session.commit()

        response = await client.get("/api/v1/auth/me", headers={"Authorization": MOCK_TOKEN})

        assert response.status_code == 200
        assert response.json()["family_members_count"] == 2

    async def test_family_members_count_zero_when_none(self, client: AsyncClient, db_session: AsyncSession):
        """GET /auth/me returns 0 when no family members exist."""
        await create_test_user(db_session)

        response = await client.get("/api/v1/auth/me", headers={"Authorization": MOCK_TOKEN})

        assert response.status_code == 200
        assert response.json()["family_members_count"] == 0


class TestUpdateMe:
    async def test_update_me_success(self, client: AsyncClient, db_session: AsyncSession):
        """PUT /auth/me updates full_name and returns updated profile."""
        await create_test_user(db_session, full_name="Old Name")

        response = await client.put(
            "/api/v1/auth/me",
            json={"full_name": "New Name"},
            headers={"Authorization": MOCK_TOKEN},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "New Name"
        assert data["email"] == "test@example.com"

    async def test_update_me_no_token_returns_4xx(self, client: AsyncClient):
        """PUT /auth/me without a token returns 401 or 403 (HTTPBearer raises 403 for missing header)."""
        response = await client.put("/api/v1/auth/me", json={"full_name": "New Name"})
        assert response.status_code in (401, 403)

    async def test_update_me_name_too_short_returns_422(self, client: AsyncClient, db_session: AsyncSession):
        """PUT /auth/me with a 1-character name returns 422 (Pydantic min_length=2)."""
        await create_test_user(db_session)

        response = await client.put(
            "/api/v1/auth/me",
            json={"full_name": "X"},
            headers={"Authorization": MOCK_TOKEN},
        )

        assert response.status_code == 422

    async def test_update_me_persists_change(self, client: AsyncClient, db_session: AsyncSession):
        """PUT /auth/me change is visible on subsequent GET /auth/me."""
        await create_test_user(db_session, full_name="Before")

        await client.put(
            "/api/v1/auth/me",
            json={"full_name": "After"},
            headers={"Authorization": MOCK_TOKEN},
        )

        get_resp = await client.get("/api/v1/auth/me", headers={"Authorization": MOCK_TOKEN})
        assert get_resp.json()["full_name"] == "After"


class TestRefreshToken:
    async def test_refresh_no_body_returns_422(self, client: AsyncClient):
        """POST /auth/refresh without a body returns 422 (missing refresh_token field)."""
        resp = await client.post("/api/v1/auth/refresh", json={})
        assert resp.status_code == 422

    async def test_refresh_invalid_token_returns_4xx(self, client: AsyncClient):
        """POST /auth/refresh with an invalid refresh token returns a 4xx error.

        In the test environment Cognito is not wired, so we expect 400, 401, or 422
        from either Pydantic validation or the exception handler.
        """
        resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "not-a-real-token"},
        )
        assert resp.status_code in (400, 401, 422)
