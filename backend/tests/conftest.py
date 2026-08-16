import sys
import asyncio
import os

# Windows event loop compatibility (must be before any app imports)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Ensure mock token backdoor is active (requires empty COGNITO_USER_POOL_ID)
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("AWS_COGNITO_USER_POOL_ID", "")

import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# SQLite dialect compatibility: JSONB → JSON, UUID (pg) → CHAR(36)
# The production models import JSONB and UUID from sqlalchemy.dialects.postgresql.
# SQLAlchemy 2.x raises a CompileError when those types hit the SQLite DDL
# compiler.  We register @compiles overrides here so that test-time
# create_all() succeeds without modifying any production model file.
# ---------------------------------------------------------------------------
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles


@compiles(PG_JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

# Import all models BEFORE create_all so all tables are registered
import app.db.models.user  # noqa
import app.db.models.family_member  # noqa
import app.db.models.consultation  # noqa
import app.db.models.chat_message  # noqa
import app.db.models.medical_record  # noqa
import app.db.models.medication  # noqa

from app.main import app
from app.db.base import Base
from app.db.session import get_db

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh in-memory SQLite database per test."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client wired to the test DB session."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def mock_bedrock():
    with patch("app.services.bedrock.bedrock_service") as mock:
        mock.invoke_nova_lite_chat = AsyncMock(
            return_value=("This is a mock AI response for testing.", ["Mock Q1?", "Mock Q2?", "Mock Q3?"])
        )
        mock.invoke_nova_lite_chat_with_history = AsyncMock(
            return_value=("This is a mock multi-turn AI response for testing.", ["Mock Q1?", "Mock Q2?", "Mock Q3?"])
        )
        mock.invoke_nova_pro_with_document = AsyncMock(
            return_value={
                "response": "Test document analysis.",
                "suggestions": [],
            }
        )
        yield mock


@pytest.fixture
def mock_s3():
    with patch("app.services.s3.s3_service") as mock:
        mock.generate_presigned_upload_url = MagicMock(return_value={
            "s3_key": "patients/test-uuid/reports/test-file.pdf",
            "upload_url": "https://s3.example.com/upload",
            "expires_in_seconds": 3600,
        })
        mock.generate_presigned_read_url = MagicMock(
            return_value="https://s3.example.com/read"
        )
        mock.delete_object = MagicMock(return_value=None)
        yield mock
