# Sprint 1 Detailed Execution Plan
**Module:** Backend Foundation, PostgreSQL Schemas & AWS Cognito Authentication  
**Target Duration:** Days 1–2  
**Prerequisites:** Python 3.12+, PostgreSQL 16+, AWS Account with Cognito Access  

---

## 1. Objective & Scope
Establish the production-ready FastAPI backend architecture, implement relational database models in PostgreSQL using SQLAlchemy 2.0 and Alembic migrations, and integrate AWS Cognito User Pool authentication via JWT verification middleware.

---

## 2. Technical Architecture & Component Layout

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py          # Signup, Login, Me endpoints
│   │       │   └── health.py        # System health & DB check
│   │       └── router.py            # API V1 router aggregation
│   ├── core/
│   │   ├── config.py                # Environment & Pydantic settings
│   │   ├── security.py              # AWS Cognito JWT verification middleware
│   │   └── exceptions.py            # Custom HTTP exception handlers
│   ├── db/
│   │   ├── base.py                  # Base declarative class
│   │   ├── session.py               # Async SQLAlchemy engine & session maker
│   │   └── models/                  # ORM Models
│   │       ├── user.py
│   │       ├── family_member.py
│   │       ├── medical_record.py
│   │       ├── medication.py
│   │       ├── consultation.py
│   │       └── chat_message.py
│   ├── schemas/                     # Pydantic Input/Output Schemas
│   │   ├── auth.py
│   │   ├── user.py
│   │   └── family_member.py
│   └── main.py                      # FastAPI app entrypoint & CORS setup
├── alembic/                         # Database migration environment
│   ├── versions/
│   └── env.py
├── alembic.ini
├── requirements.txt
└── .env.example
```

---

## 3. Step-by-Step Task Breakdown

### Task 1.1: FastAPI Foundation & Environment Configuration
1. Initialize virtual environment and create `requirements.txt`:
   ```text
   fastapi==0.115.0
   uvicorn[standard]==0.31.0
   sqlalchemy[asyncio]==2.0.35
   asyncpg==0.29.0
   alembic==1.13.3
   pydantic==2.9.2
   pydantic-settings==2.5.2
   python-jose[cryptography]==3.3.0
   boto3==1.35.30
   httpx==0.27.2
   pytest==8.3.3
   ```
2. Implement `app/core/config.py` using `pydantic-settings`:
   - Enforce environment variable validation for `POSTGRES_SERVER`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_APP_CLIENT_ID`, `AWS_REGION` (`us-west-2`).

### Task 1.2: Database Schema & SQLAlchemy ORM Modeling
Define relational tables in `app/db/models/`:

1. **`users` Table:**
   - `id`: UUID (Primary Key, default uuid4)
   - `cognito_sub`: String(255) (Unique, Indexed)
   - `email`: String(255) (Unique, Indexed)
   - `full_name`: String(255)
   - `created_at`: DateTime(timezone=True) (default UTC now)

2. **`family_members` Table:**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key `users.id` ON DELETE CASCADE)
   - `name`: String(255)
   - `relationship`: Enum (`self`, `spouse`, `child`, `parent`, `sibling`, `other`)
   - `date_of_birth`: Date
   - `gender`: Enum (`male`, `female`, `other`)
   - `blood_group`: String(10) (Optional: e.g. "A+", "O-")
   - `medical_conditions`: JSONB (List of strings)
   - `allergies`: JSONB (List of strings)
   - `created_at`: DateTime(timezone=True)

3. **`medical_records` Table:**
   - `id`: UUID (Primary Key)
   - `family_member_id`: UUID (Foreign Key `family_members.id` ON DELETE CASCADE)
   - `title`: String(255)
   - `record_type`: Enum (`lab_report`, `prescription`, `vitals_summary`, `other`)
   - `s3_key`: String(512)
   - `summary`: Text (Optional)
   - `extracted_data`: JSONB (Key-value pairs of lab parameters)
   - `record_date`: Date

4. **`medications` Table:**
   - `id`: UUID (Primary Key)
   - `family_member_id`: UUID (Foreign Key `family_members.id`)
   - `name`: String(255)
   - `dosage`: String(100) (e.g. "500mg")
   - `frequency`: String(100) (e.g. "Twice daily")
   - `is_active`: Boolean (Default True)

5. **`consultations` Table:**
   - `id`: UUID (Primary Key)
   - `family_member_id`: UUID (Foreign Key `family_members.id`)
   - `title`: String(255)
   - `care_plan_summary`: JSONB (Optional)
   - `created_at`: DateTime(timezone=True)

6. **`chat_messages` Table:**
   - `id`: UUID (Primary Key)
   - `consultation_id`: UUID (Foreign Key `consultations.id` ON DELETE CASCADE)
   - `sender`: Enum (`user`, `ai`)
   - `text`: Text
   - `structured_json`: JSONB (Optional AI output metadata)
   - `created_at`: DateTime(timezone=True)

### Task 1.3: AWS Cognito JWT Verification Middleware
1. Build `app/core/security.py`:
   - Fetch and cache Cognito JWKS public keys from `https://cognito-idp.ap-south-1.amazonaws.com/<user_pool_id>/.well-known/jwks.json`.
   - Implement `get_current_user` dependency verifying JWT token header `Authorization: Bearer <token>`.
   - Decode payload, verify `iss`, `aud` (App Client ID), token expiration (`exp`), and extract `sub` and `email`.
   - Auto-create user record in PostgreSQL on first valid login if non-existent.

---

## 4. Input & Output Specs and Validation Rules

### Endpoint 1: `POST /api/v1/auth/register`
- **Request Headers:** `Content-Type: application/json`
- **Input Pydantic Schema (`UserRegisterRequest`):**
  ```python
  class UserRegisterRequest(BaseModel):
      email: EmailStr
      password: str = Field(..., min_length=8, max_length=64, description="Must contain uppercase, lowercase, number, and special character")
      full_name: str = Field(..., min_length=2, max_length=100)
  ```
- **Validation Rules:**
  - Email format compliance (Regex matching standard email).
  - Password strength: `>= 8 chars`, at least 1 uppercase, 1 lowercase, 1 number, 1 special character.
- **Output Pydantic Schema (`UserRegisterResponse`):**
  ```python
  class UserRegisterResponse(BaseModel):
      user_id: UUID
      email: EmailStr
      cognito_sub: str
      message: str = "User registered successfully. Please check your email for confirmation."
  ```
- **HTTP Status Codes:**
  - `201 Created`: User successfully registered in Cognito and DB.
  - `400 Bad Request`: Email already exists in Cognito/DB.
  - `422 Unprocessable Entity`: Input payload failed Pydantic validation.

### Endpoint 2: `POST /api/v1/auth/login`
- **Request Headers:** `Content-Type: application/json`
- **Input Pydantic Schema (`UserLoginRequest`):**
  ```python
  class UserLoginRequest(BaseModel):
      email: EmailStr
      password: str
  ```
- **Output Pydantic Schema (`TokenResponse`):**
  ```python
  class TokenResponse(BaseModel):
      access_token: str
      id_token: str
      refresh_token: str
      token_type: str = "Bearer"
      expires_in: int
  ```
- **HTTP Status Codes:**
  - `200 OK`: Valid credentials; tokens returned.
  - `401 Unauthorized`: Invalid email/password combination or unconfirmed user account.

### Endpoint 3: `GET /api/v1/auth/me`
- **Request Headers:** `Authorization: Bearer <JWT_ID_TOKEN>`
- **Output Pydantic Schema (`UserProfileResponse`):**
  ```python
  class UserProfileResponse(BaseModel):
      id: UUID
      email: EmailStr
      full_name: str
      created_at: datetime
      family_members_count: int
  ```
- **HTTP Status Codes:**
  - `200 OK`: User profile returned.
  - `401 Unauthorized`: Token missing, expired, or invalid signature.

---

## 5. Acceptance Criteria & Verification Steps

1. **Alembic Database Migration Check:**
   ```bash
   alembic revision --autogenerate -m "Initial schema setup"
   alembic upgrade head
   ```
   *Pass Criteria:* All 6 tables created in PostgreSQL with correct foreign keys, UUID primary keys, and indices.

2. **Auth API Integration Test:**
   ```bash
   pytest tests/test_auth.py -v
   ```
   *Pass Criteria:* 
   - Registering a user creates Cognito user + PostgreSQL record.
   - Login returns valid JWT `access_token` and `id_token`.
   - Accessing `/api/v1/auth/me` with token returns `200 OK`; without token returns `401 Unauthorized`.
