import pytest
import pytest_asyncio
import uuid
import datetime
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.user import User
from app.db.models.family_member import FamilyMember, RelationshipEnum, GenderEnum

from app.core.security import get_current_user

@pytest_asyncio.fixture
async def test_user_a(db_session: AsyncSession):
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        cognito_sub="00000000-0000-0000-0000-000000000000",
        email="test_a@example.com",
        full_name="User A",
    )
    db_session.add(user)
    await db_session.commit()
    return {"id": user.id, "token": "mock-token-test_a@example.com"}

@pytest_asyncio.fixture
async def test_family_member_a(db_session: AsyncSession, test_user_a):
    member = FamilyMember(
        id=uuid.uuid4(),
        user_id=test_user_a["id"],
        name="John A",
        relationship=RelationshipEnum.self,
        date_of_birth=datetime.date(1990, 1, 1),
        gender=GenderEnum.male,
    )
    db_session.add(member)
    await db_session.commit()
    return {"id": member.id}

@pytest.mark.asyncio
async def test_create_and_get_medications(client: AsyncClient, db_session, test_user_a, test_family_member_a):
    token = test_user_a["token"]
    family_member_id = test_family_member_a["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create medication 1
    response = await client.post(
        f"/api/v1/medications/{family_member_id}",
        json={"name": "Aspirin", "dosage": "100mg", "frequency": "Daily"},
        headers=headers
    )
    assert response.status_code == 201
    med1 = response.json()
    assert med1["name"] == "Aspirin"
    assert med1["is_active"] is True

    # Create medication 2 (inactive)
    response = await client.post(
        f"/api/v1/medications/{family_member_id}",
        json={"name": "Ibuprofen", "dosage": "200mg", "frequency": "As needed", "is_active": False},
        headers=headers
    )
    assert response.status_code == 201

    # Get active medications (default)
    response = await client.get(
        f"/api/v1/medications/{family_member_id}",
        headers=headers
    )
    assert response.status_code == 200
    meds = response.json()
    assert len(meds) == 1
    assert meds[0]["name"] == "Aspirin"

    # Get all medications
    response = await client.get(
        f"/api/v1/medications/{family_member_id}?include_inactive=true",
        headers=headers
    )
    assert response.status_code == 200
    all_meds = response.json()
    assert len(all_meds) == 2

@pytest.mark.asyncio
async def test_update_and_delete_medication(client: AsyncClient, db_session, test_user_a, test_family_member_a):
    token = test_user_a["token"]
    family_member_id = test_family_member_a["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    response = await client.post(
        f"/api/v1/medications/{family_member_id}",
        json={"name": "Tylenol", "dosage": "500mg", "frequency": "Twice a day"},
        headers=headers
    )
    med_id = response.json()["id"]

    # Update
    response = await client.put(
        f"/api/v1/medications/{med_id}",
        json={"is_active": False},
        headers=headers
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    # Delete
    response = await client.delete(
        f"/api/v1/medications/{med_id}",
        headers=headers
    )
    assert response.status_code == 204

    # Verify deleted
    response = await client.get(
        f"/api/v1/medications/{family_member_id}?include_inactive=true",
        headers=headers
    )
    assert len(response.json()) == 0

@pytest.mark.asyncio
async def test_medication_ownership(client: AsyncClient, db_session, test_user_a, test_family_member_a):
    family_member_id_a = test_family_member_a["id"]
    token_a = test_user_a["token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    from app.main import app
    
    def override_get_current_user_b():
        return {"sub": str(uuid.uuid4()), "email": "test_b@example.com"}

    app.dependency_overrides[get_current_user] = override_get_current_user_b
    
    # User B tries to get User A's medications
    response = await client.get(
        f"/api/v1/medications/{family_member_id_a}",
        headers={"Authorization": "Bearer any"}
    )
    assert response.status_code == 403

    app.dependency_overrides.clear()

    # User A creates medication
    response = await client.post(
        f"/api/v1/medications/{family_member_id_a}",
        json={"name": "Lisinopril", "dosage": "10mg", "frequency": "Daily"},
        headers=headers_a
    )
    med_id = response.json()["id"]

    app.dependency_overrides[get_current_user] = override_get_current_user_b

    # User B tries to update User A's medication
    response = await client.put(
        f"/api/v1/medications/{med_id}",
        json={"is_active": False},
        headers={"Authorization": "Bearer any"}
    )
    assert response.status_code == 403

    # User B tries to delete User A's medication
    response = await client.delete(
        f"/api/v1/medications/{med_id}",
        headers={"Authorization": "Bearer any"}
    )
    assert response.status_code == 403
    
    app.dependency_overrides.clear()
