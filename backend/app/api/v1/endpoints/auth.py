from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import UserRegisterRequest, UserRegisterResponse, UserLoginRequest, TokenResponse
from app.schemas.user import UserProfileResponse
from app.core.security import get_current_user
from app.core.exceptions import BadRequestException
import uuid

router = APIRouter()

@router.post("/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise BadRequestException(detail="Email already registered")
        
    # In a real app, this is where we'd call boto3 to create the user in Cognito
    # For now, we mock the cognito_sub
    cognito_sub = str(uuid.uuid4())
    
    new_user = User(
        email=request.email,
        full_name=request.full_name,
        cognito_sub=cognito_sub
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserRegisterResponse(
        user_id=new_user.id,
        email=new_user.email,
        cognito_sub=new_user.cognito_sub
    )

@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest):
    # In a real app, this is where we'd call boto3 initiate_auth against Cognito
    # Returning mock tokens for development scaffolding
    return TokenResponse(
        access_token="mock-access-token",
        id_token="mock-token",
        refresh_token="mock-refresh-token",
        expires_in=3600
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_me(claims: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Find user by cognito sub (or email for mock)
    email = claims.get("email")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise BadRequestException(detail="User not found in DB")
        
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        family_members_count=0  # Mock count for now
    )
