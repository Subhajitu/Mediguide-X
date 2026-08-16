import time
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.utils import base64url_decode
import httpx
from app.core.config import settings
from typing import Dict, Any

auth_scheme = HTTPBearer()

JWKS_CACHE_TTL_SECONDS: int = 3600

jwks_cache: Dict[str, Any] = {}
jwks_cache_timestamp: float = 0.0


async def get_jwks() -> dict:
    global jwks_cache, jwks_cache_timestamp

    now = time.time()
    if jwks_cache and (now - jwks_cache_timestamp) < JWKS_CACHE_TTL_SECONDS:
        return jwks_cache

    if settings.ENVIRONMENT == "development" and not settings.AWS_COGNITO_USER_POOL_ID:
        return {}

    url = f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        jwks_cache.clear()
        jwks_cache.update(response.json())
        jwks_cache_timestamp = now
        return jwks_cache


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> dict:
    token = credentials.credentials

    if settings.ENVIRONMENT == "development" and not settings.AWS_COGNITO_USER_POOL_ID:
        if token.startswith("mock-token-"):
            email = token.replace("mock-token-", "")
            return {"sub": "00000000-0000-0000-0000-000000000000", "email": email}
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        keys = await get_jwks()

        key = next((k for k in keys.get("keys", []) if k["kid"] == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Public key not found in JWKS")

        public_key = jwk.construct(key)
        message, encoded_signature = str(token).rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))

        if not public_key.verify(message.encode("utf-8"), decoded_signature):
            raise HTTPException(status_code=401, detail="Signature verification failed")

        claims = jwt.get_unverified_claims(token)

        # Verify expiration
        from datetime import datetime, timezone
        if datetime.now(timezone.utc).timestamp() > claims.get("exp", 0):
            raise HTTPException(status_code=401, detail="Token is expired")

        # Verify audience/client_id
        if claims.get("aud") != settings.AWS_COGNITO_APP_CLIENT_ID and claims.get("client_id") != settings.AWS_COGNITO_APP_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token was not issued for this audience")

        return claims

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


from starlette.requests import Request as StarletteRequest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.models.user import User
from app.core.exceptions import BadRequestException


async def get_current_user(
    request: StarletteRequest,
    claims: dict = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    # AccessToken from Cognito doesn't always contain email, but it contains 'sub' or 'username'
    cognito_sub = claims.get("sub") or claims.get("username")
    result = await db.execute(select(User).where(User.cognito_sub == cognito_sub))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found in database")

    # Inject the real database UUID as 'sub' so endpoints can use current_user["sub"] uniformly.
    claims["sub"] = str(user.id)
    # Inject email into claims so endpoints like get_me can use it without an extra query.
    claims["email"] = user.email
    # Populate request.state so the rate limiter can key on the authenticated user's UUID
    # rather than falling back to IP address.
    request.state.user_id = str(user.id)
    return claims
