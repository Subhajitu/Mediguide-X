from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=64, description="Must contain uppercase, lowercase, number, and special character")
    full_name: str = Field(..., min_length=2, max_length=100)

class UserRegisterResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    cognito_sub: str
    message: str = "User registered successfully. Please check your email for confirmation."

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    id_token: str
    refresh_token: str = ""   # empty string on refresh responses (Cognito doesn't rotate refresh tokens)
    token_type: str = "Bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class RefreshTokenResponse(BaseModel):
    access_token: str
    id_token: str
    token_type: str = "Bearer"
    expires_in: int
