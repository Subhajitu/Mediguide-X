from pydantic_settings import BaseSettings
from typing import List, Optional, Literal


class Settings(BaseSettings):
    PROJECT_NAME: str = "Mediguide X API"
    API_V1_STR: str = "/api/v1"

    # Environment — controls mock token backdoor and other dev-only paths
    ENVIRONMENT: Literal["development", "production", "test"] = "production"

    # Database
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_PORT: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    @property
    def ASYNC_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            # Ensure it uses psycopg
            return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg://")
        # Fallback to local
        return "postgresql+psycopg://postgres:postgres@localhost:5432/mediguide"

    # CORS — explicit allowlist; never use allow_origin_regex=".*"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # AWS Config
    AWS_REGION: str = "us-west-2"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_COGNITO_USER_POOL_ID: Optional[str] = None
    AWS_COGNITO_APP_CLIENT_ID: Optional[str] = None
    AWS_COGNITO_APP_CLIENT_SECRET: Optional[str] = None
    AWS_S3_BUCKET_NAME: Optional[str] = None

    # AI conversation history
    AI_HISTORY_TURNS: int = 3  # number of user/assistant turn-pairs to include (default: 3 pairs = 6 messages)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
