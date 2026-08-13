from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mediguide X API"
    API_V1_STR: str = "/api/v1"
    
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
    
    # AWS Config
    AWS_REGION: str = "us-west-2"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_COGNITO_USER_POOL_ID: Optional[str] = None
    AWS_COGNITO_APP_CLIENT_ID: Optional[str] = None
    AWS_S3_BUCKET_NAME: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
