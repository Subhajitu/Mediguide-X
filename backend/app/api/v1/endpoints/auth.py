from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import UserRegisterRequest, UserRegisterResponse, UserLoginRequest, TokenResponse
from app.schemas.user import UserProfileResponse
from app.core.security import get_current_user
from app.core.exceptions import BadRequestException
from app.core.config import settings
import boto3
import hmac
import hashlib
import base64

def get_secret_hash(username: str, client_id: str, client_secret: str) -> str:
    message = bytes(username + client_id, 'utf-8')
    key = bytes(client_secret, 'utf-8')
    secret_hash = base64.b64encode(hmac.new(key, message, digestmod=hashlib.sha256).digest()).decode()
    return secret_hash

router = APIRouter()

cognito_client = boto3.client(
    'cognito-idp',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

@router.post("/register", response_model=UserRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise BadRequestException(detail="Email already registered")
        
    try:
        kwargs = {
            'ClientId': settings.AWS_COGNITO_APP_CLIENT_ID,
            'Username': request.email,
            'Password': request.password,
            'UserAttributes': [
                {'Name': 'email', 'Value': request.email},
                {'Name': 'name', 'Value': request.full_name}
            ]
        }
        if settings.AWS_COGNITO_APP_CLIENT_SECRET:
            kwargs['SecretHash'] = get_secret_hash(
                request.email, 
                settings.AWS_COGNITO_APP_CLIENT_ID, 
                settings.AWS_COGNITO_APP_CLIENT_SECRET
            )
            
        response = cognito_client.sign_up(**kwargs)
        cognito_sub = response['UserSub']
        
        # Auto-confirm the user for MVP so they can login immediately
        if settings.AWS_COGNITO_USER_POOL_ID:
            cognito_client.admin_confirm_sign_up(
                UserPoolId=settings.AWS_COGNITO_USER_POOL_ID,
                Username=request.email
            )
            
    except cognito_client.exceptions.UsernameExistsException:
        raise BadRequestException(detail="Email already registered in Cognito")
    except Exception as e:
        raise BadRequestException(detail=f"Cognito Error: {str(e)}")
        
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
async def login(request: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists in the database
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    try:
        auth_params = {
            'USERNAME': request.email,
            'PASSWORD': request.password
        }
        if settings.AWS_COGNITO_APP_CLIENT_SECRET:
            auth_params['SECRET_HASH'] = get_secret_hash(
                request.email, 
                settings.AWS_COGNITO_APP_CLIENT_ID, 
                settings.AWS_COGNITO_APP_CLIENT_SECRET
            )
            
        response = cognito_client.initiate_auth(
            ClientId=settings.AWS_COGNITO_APP_CLIENT_ID,
            AuthFlow='USER_PASSWORD_AUTH',
            AuthParameters=auth_params
        )
        
        auth_result = response['AuthenticationResult']
        
        return TokenResponse(
            access_token=auth_result['AccessToken'],
            id_token=auth_result['IdToken'],
            refresh_token=auth_result.get('RefreshToken', ''),
            expires_in=auth_result['ExpiresIn']
        )
    except cognito_client.exceptions.NotAuthorizedException:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    except cognito_client.exceptions.UserNotConfirmedException:
        raise HTTPException(status_code=401, detail="User is not confirmed")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

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
