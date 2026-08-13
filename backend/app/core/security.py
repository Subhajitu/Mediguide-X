from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.utils import base64url_decode
import httpx
from app.core.config import settings
from typing import Dict, Any

auth_scheme = HTTPBearer()
jwks_cache: Dict[str, Any] = {}

async def get_jwks() -> dict:
    if jwks_cache:
        return jwks_cache
    if not settings.AWS_COGNITO_USER_POOL_ID:
        # Mock for local dev if cognito isn't configured
        return {}
        
    url = f"https://cognito-idp.{settings.AWS_REGION}.amazonaws.com/{settings.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        jwks_cache.update(response.json())
        return jwks_cache

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> dict:
    token = credentials.credentials
    if not settings.AWS_COGNITO_USER_POOL_ID:
        # Development mock
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
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.models.user import User
from app.core.exceptions import BadRequestException

async def get_current_user(claims: dict = Depends(verify_token), db: AsyncSession = Depends(get_db)):
    # AccessToken from Cognito doesn't always contain email, but it contains 'sub' or 'username'
    cognito_sub = claims.get("sub") or claims.get("username")
    result = await db.execute(select(User).where(User.cognito_sub == cognito_sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found in database")
        
    # We inject the real database ID as the 'sub' so that endpoints relying on current_user['sub'] work seamlessly.
    claims["sub"] = str(user.id)
    # Inject email into claims so endpoints like get_me can use it
    claims["email"] = user.email
    return claims
