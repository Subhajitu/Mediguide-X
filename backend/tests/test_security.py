"""
Security tests: IDOR prevention and authentication enforcement.

These tests verify that:
1. Every endpoint returns 403 or 404 when user A attempts to access user B's resources
2. Every endpoint returns 401 or 403 when no auth token is provided
3. The ownership chain (user → family_member → consultation/record) is enforced at every level

Endpoint ownership behaviour (confirmed from source):
  PUT   /family/{member_id}                      → 404 when member not owned
  DELETE /family/{member_id}                     → 404 when member not owned
  GET   /consultations/{family_member_id}        → 403 when member not owned
  POST  /consultations/{family_member_id}/messages → 403 when member not owned
  POST  /consultations/{consultation_id}/care-plan → 404 when consultation not owned
  GET   /reports/{family_member_id}              → 403 when member not owned
  POST  /reports/upload-url                      → 403 when family_member_id not owned
  POST  /reports/{record_id}/analyze             → 404 when record not owned
"""
import pytest
import pytest_asyncio
import uuid
import datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User
from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum
from app.db.models.consultation import Consultation
from app.db.models.medical_record import MedicalRecord, RecordTypeEnum
from app.core.security import get_current_user
from app.db.session import get_db
from app.main import app


# ---------------------------------------------------------------------------
# DB helpers — insert test rows without going through the API
# ---------------------------------------------------------------------------

async def make_family_member(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str = "Test Member",
) -> FamilyMember:
    member = FamilyMember(
        id=uuid.uuid4(),
        user_id=user_id,
        name=name,
        relationship=RelationshipEnum.child,
        date_of_birth=datetime.date(2000, 1, 1),
        gender=GenderEnum.other,
        medical_conditions=[],
        allergies=[],
    )
    db.add(member)
    await db.flush()
    return member


async def make_consultation(
    db: AsyncSession,
    family_member_id: uuid.UUID,
) -> Consultation:
    c = Consultation(
        id=uuid.uuid4(),
        family_member_id=family_member_id,
        title="Test Consultation",
    )
    db.add(c)
    await db.flush()
    return c


async def make_medical_record(
    db: AsyncSession,
    family_member_id: uuid.UUID,
) -> MedicalRecord:
    r = MedicalRecord(
        id=uuid.uuid4(),
        family_member_id=family_member_id,
        title="Test Report",
        record_type=RecordTypeEnum.lab_report,
        s3_key=f"patients/{family_member_id}/reports/{uuid.uuid4()}.pdf",
        record_date=datetime.date.today(),
    )
    db.add(r)
    await db.flush()
    return r


# ---------------------------------------------------------------------------
# Fixture: two users sharing one DB session, with a helper to make requests
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def two_users(db_session: AsyncSession):
    """
    Yields (user_a, user_b).

    Use ``make_request_as(user, method, url, **kwargs)`` to make authenticated
    requests as a specific user.  Both users share the same in-memory DB so
    rows created in the test are immediately visible to the HTTP calls.
    """
    user_a = User(
        id=uuid.uuid4(),
        cognito_sub="aaaa-0000-user-a",
        email="a@security-test.com",
        full_name="User A",
    )
    user_b = User(
        id=uuid.uuid4(),
        cognito_sub="bbbb-0000-user-b",
        email="b@security-test.com",
        full_name="User B",
    )
    db_session.add(user_a)
    db_session.add(user_b)
    await db_session.commit()
    await db_session.refresh(user_a)
    await db_session.refresh(user_b)

    async def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db

    yield user_a, user_b

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


async def make_request_as(
    user: User,
    method: str,
    url: str,
    **kwargs,
):
    """
    Execute a single HTTP request authenticated as *user*.

    Temporarily installs a ``get_current_user`` override that returns the
    user's real DB UUID as ``sub``, bypassing all token logic.  This lets
    IDOR tests focus purely on the ownership-check layer.
    """
    async def auth_override():
        return {"sub": str(user.id), "email": user.email}

    app.dependency_overrides[get_current_user] = auth_override
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await getattr(c, method)(url, **kwargs)
    app.dependency_overrides.pop(get_current_user, None)
    return resp


# ---------------------------------------------------------------------------
# Payload builders
# ---------------------------------------------------------------------------

def family_member_payload(**overrides) -> dict:
    base = {
        "name": "Hijacked Member",
        "relationship": "child",
        "date_of_birth": "2000-01-01",
        "gender": "other",
    }
    base.update(overrides)
    return base


def upload_url_payload(family_member_id: uuid.UUID, **overrides) -> dict:
    base = {
        "family_member_id": str(family_member_id),
        "filename": "blood_test.pdf",
        "content_type": "application/pdf",
        "title": "Blood Test",
        "record_type": "lab_report",
        "record_date": "2024-01-01",
    }
    base.update(overrides)
    return base


# ===========================================================================
# TestFamilyEndpointAuth
# Authentication guard: no token → 401/403
# ===========================================================================

class TestFamilyEndpointAuth:
    """Family endpoints reject unauthenticated requests."""

    async def test_list_family_no_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/family")
        assert resp.status_code in (401, 403)

    async def test_create_family_no_token(self, client: AsyncClient):
        resp = await client.post("/api/v1/family", json=family_member_payload())
        assert resp.status_code in (401, 403)

    async def test_update_family_no_token(self, client: AsyncClient):
        resp = await client.put(
            f"/api/v1/family/{uuid.uuid4()}", json=family_member_payload()
        )
        assert resp.status_code in (401, 403)

    async def test_delete_family_no_token(self, client: AsyncClient):
        resp = await client.delete(f"/api/v1/family/{uuid.uuid4()}")
        assert resp.status_code in (401, 403)


# ===========================================================================
# TestFamilyIDOR
# Ownership: user B cannot modify or delete user A's family members
# ===========================================================================

class TestFamilyIDOR:
    """User B cannot modify or delete User A's family members."""

    async def test_update_other_users_family_member_returns_404(
        self, two_users, db_session: AsyncSession
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id, "A's Member")
        await db_session.commit()

        resp = await make_request_as(
            user_b,
            "put",
            f"/api/v1/family/{member.id}",
            json=family_member_payload(),
        )
        # Ownership check returns 404 — member doesn't exist for user_b
        assert resp.status_code in (403, 404)

    async def test_delete_other_users_family_member_returns_404(
        self, two_users, db_session: AsyncSession
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await db_session.commit()

        resp = await make_request_as(user_b, "delete", f"/api/v1/family/{member.id}")
        assert resp.status_code in (403, 404)

    async def test_user_a_can_still_update_own_member(
        self, two_users, db_session: AsyncSession
    ):
        """Sanity check: user A's own member is still accessible after the attack."""
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id, "Alice's Child")
        await db_session.commit()

        resp = await make_request_as(
            user_a,
            "put",
            f"/api/v1/family/{member.id}",
            json=family_member_payload(name="Updated Name"),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    async def test_list_family_only_returns_own_members(
        self, two_users, db_session: AsyncSession
    ):
        """GET /family returns only the requesting user's family members."""
        user_a, user_b = two_users
        await make_family_member(db_session, user_a.id, "A's Member")
        await make_family_member(db_session, user_b.id, "B's Member")
        await db_session.commit()

        resp = await make_request_as(user_a, "get", "/api/v1/family")
        assert resp.status_code == 200
        names = [m["name"] for m in resp.json()]
        assert "A's Member" in names
        assert "B's Member" not in names


# ===========================================================================
# TestConsultationAuth
# Authentication guard: no token → 401/403
# ===========================================================================

class TestConsultationAuth:
    """Consultation endpoints reject unauthenticated requests."""

    async def test_get_consultations_no_token(self, client: AsyncClient):
        resp = await client.get(f"/api/v1/consultations/{uuid.uuid4()}")
        assert resp.status_code in (401, 403)

    async def test_send_message_no_token(self, client: AsyncClient):
        resp = await client.post(
            f"/api/v1/consultations/{uuid.uuid4()}/messages",
            json={"message": "I have chest pain"},
        )
        assert resp.status_code in (401, 403)

    async def test_care_plan_no_token(self, client: AsyncClient):
        resp = await client.post(f"/api/v1/consultations/{uuid.uuid4()}/care-plan")
        assert resp.status_code in (401, 403)


# ===========================================================================
# TestConsultationIDOR
# Ownership: user B cannot read/write to user A's family member consultations
# ===========================================================================

class TestConsultationIDOR:
    """User B cannot read or interact with User A's consultations."""

    async def test_get_consultations_for_other_user_family_member(
        self, two_users, db_session: AsyncSession
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await db_session.commit()

        resp = await make_request_as(
            user_b, "get", f"/api/v1/consultations/{member.id}"
        )
        assert resp.status_code == 403

    async def test_send_message_to_other_users_family_member(
        self, two_users, db_session: AsyncSession
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await db_session.commit()

        # Use a clearly medical query to ensure the guardrail doesn't short-circuit
        # before the ownership check fires.
        resp = await make_request_as(
            user_b,
            "post",
            f"/api/v1/consultations/{member.id}/messages",
            json={"message": "I have chest pain and shortness of breath"},
        )
        assert resp.status_code == 403

    async def test_care_plan_for_other_users_consultation(
        self, two_users, db_session: AsyncSession
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        consultation = await make_consultation(db_session, member.id)
        await db_session.commit()

        resp = await make_request_as(
            user_b, "post", f"/api/v1/consultations/{consultation.id}/care-plan"
        )
        # care-plan uses a JOIN ownership check that returns 404
        assert resp.status_code in (403, 404)

    async def test_user_a_can_read_own_consultations(
        self, two_users, db_session: AsyncSession
    ):
        """Sanity check: user A can still read their own consultations after the attacks."""
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await make_consultation(db_session, member.id)
        await db_session.commit()

        resp = await make_request_as(
            user_a, "get", f"/api/v1/consultations/{member.id}"
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1


# ===========================================================================
# TestReportAuth
# Authentication guard: no token → 401/403
# ===========================================================================

class TestReportAuth:
    """Report endpoints reject unauthenticated requests."""

    async def test_list_reports_no_token(self, client: AsyncClient):
        resp = await client.get(f"/api/v1/reports/{uuid.uuid4()}")
        assert resp.status_code in (401, 403)

    async def test_upload_url_no_token(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/reports/upload-url",
            json=upload_url_payload(uuid.uuid4()),
        )
        assert resp.status_code in (401, 403)

    async def test_analyze_no_token(self, client: AsyncClient):
        resp = await client.post(f"/api/v1/reports/{uuid.uuid4()}/analyze")
        assert resp.status_code in (401, 403)


# ===========================================================================
# TestReportIDOR
# Ownership: user B cannot access or trigger analysis on user A's reports
# ===========================================================================

class TestReportIDOR:
    """User B cannot access User A's medical reports."""

    async def test_list_reports_for_other_user_member(
        self, two_users, db_session: AsyncSession
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await db_session.commit()

        resp = await make_request_as(
            user_b, "get", f"/api/v1/reports/{member.id}"
        )
        assert resp.status_code == 403

    async def test_upload_url_for_other_user_member(
        self, two_users, db_session: AsyncSession, mock_s3
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await db_session.commit()

        resp = await make_request_as(
            user_b,
            "post",
            "/api/v1/reports/upload-url",
            json=upload_url_payload(member.id),
        )
        assert resp.status_code == 403

    async def test_analyze_other_users_record(
        self, two_users, db_session: AsyncSession, mock_s3
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        record = await make_medical_record(db_session, member.id)
        await db_session.commit()

        resp = await make_request_as(
            user_b, "post", f"/api/v1/reports/{record.id}/analyze"
        )
        # analyze uses a JOIN ownership check that returns 404
        assert resp.status_code in (403, 404)

    async def test_user_a_can_list_own_reports(
        self, two_users, db_session: AsyncSession, mock_s3
    ):
        """Sanity check: user A can still list their own reports after the attacks."""
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        await make_medical_record(db_session, member.id)
        await db_session.commit()

        resp = await make_request_as(
            user_a, "get", f"/api/v1/reports/{member.id}"
        )
        assert resp.status_code == 200
        assert len(resp.json()["records"]) == 1


# ===========================================================================
# TestRandomUUIDAccess
# Random/non-existent UUIDs never return 200 or 500
# ===========================================================================

class TestRandomUUIDAccess:
    """
    Random UUIDs that don't belong to any user should return 403 or 404,
    never 200 (data leak) or 500 (internal error).

    These tests use the mock-token path (cognito_sub lookup), so they also
    exercise the full get_current_user → ownership check stack.
    """

    MOCK_COGNITO_SUB = "00000000-0000-0000-0000-000000000000"
    MOCK_TOKEN = "Bearer mock-token-random@security-test.com"

    async def _seed_user(self, db: AsyncSession, email: str) -> User:
        """Insert the user the mock token resolves to."""
        user = User(
            id=uuid.uuid4(),
            cognito_sub=self.MOCK_COGNITO_SUB,
            email=email,
            full_name="Random Test User",
        )
        db.add(user)
        await db.commit()
        return user

    async def test_random_family_member_id_in_consultations(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        await self._seed_user(db_session, "random@security-test.com")
        resp = await client.get(
            f"/api/v1/consultations/{uuid.uuid4()}",
            headers={"Authorization": self.MOCK_TOKEN},
        )
        assert resp.status_code in (403, 404)
        assert resp.status_code != 200
        assert resp.status_code != 500

    async def test_random_family_member_id_in_reports(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        await self._seed_user(db_session, "random@security-test.com")
        resp = await client.get(
            f"/api/v1/reports/{uuid.uuid4()}",
            headers={"Authorization": self.MOCK_TOKEN},
        )
        assert resp.status_code in (403, 404)
        assert resp.status_code != 200
        assert resp.status_code != 500

    async def test_random_record_id_in_analyze(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        await self._seed_user(db_session, "random@security-test.com")
        resp = await client.post(
            f"/api/v1/reports/{uuid.uuid4()}/analyze",
            headers={"Authorization": self.MOCK_TOKEN},
        )
        assert resp.status_code in (403, 404)
        assert resp.status_code != 200
        assert resp.status_code != 500

    async def test_random_consultation_id_in_care_plan(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        await self._seed_user(db_session, "random@security-test.com")
        resp = await client.post(
            f"/api/v1/consultations/{uuid.uuid4()}/care-plan",
            headers={"Authorization": self.MOCK_TOKEN},
        )
        assert resp.status_code in (403, 404)
        assert resp.status_code != 200
        assert resp.status_code != 500


# ===========================================================================
# TestRecordDeletion
# DELETE /reports/{record_id} — ownership and auth behavior
# ===========================================================================

class TestRecordDeletion:
    """DELETE /reports/{record_id} ownership and behavior tests."""

    async def test_delete_own_record_returns_204(
        self, two_users, db_session: AsyncSession, mock_s3
    ):
        user_a, _ = two_users
        member = await make_family_member(db_session, user_a.id)
        record = await make_medical_record(db_session, member.id)
        await db_session.commit()

        resp = await make_request_as(user_a, "delete", f"/api/v1/reports/{record.id}")
        assert resp.status_code == 204

    async def test_delete_other_users_record_returns_404(
        self, two_users, db_session: AsyncSession, mock_s3
    ):
        user_a, user_b = two_users
        member = await make_family_member(db_session, user_a.id)
        record = await make_medical_record(db_session, member.id)
        await db_session.commit()

        resp = await make_request_as(user_b, "delete", f"/api/v1/reports/{record.id}")
        assert resp.status_code == 404

    async def test_delete_nonexistent_record_returns_404(
        self, two_users, db_session: AsyncSession
    ):
        user_a, _ = two_users
        resp = await make_request_as(user_a, "delete", f"/api/v1/reports/{uuid.uuid4()}")
        assert resp.status_code == 404

    async def test_delete_no_token_returns_4xx(self, client: AsyncClient):
        resp = await client.delete(f"/api/v1/reports/{uuid.uuid4()}")
        assert resp.status_code in (401, 403)
