# Sprint 2 Detailed Execution Plan
**Module:** AWS S3 Document Storage & Patient Context RAG Engine  
**Target Duration:** Days 3–4  
**Prerequisites:** Completed Sprint 1, AWS Bedrock Nova Model Access Enabled in `ap-south-1`  

---

## 1. Objective & Scope
Implement the S3 medical report storage pipeline, build the Clinical Context Engine (Patient-Centric RAG) to aggregate patient records from PostgreSQL, and integrate Amazon Nova Lite (`amazon.nova-lite-v1:0`) via AWS Bedrock SDK for context-aware medical consultations.

---

## 2. Technical Architecture & Component Layout

```
backend/app/
├── api/v1/endpoints/
│   ├── reports.py             # S3 presigned URL & report metadata APIs
│   └── consultations.py       # Live chat & consultation history APIs
├── services/
│   ├── s3.py                  # AWS S3 file upload & signed URL helper
│   ├── context_engine.py      # Patient Context Assembly RAG module
│   └── bedrock.py             # Amazon Bedrock Nova Lite boto3 client
└── schemas/
    ├── report.py
    └── consultation.py
```

---

## 3. Step-by-Step Task Breakdown

### Task 2.1: S3 Storage Pipeline & Pre-signed Uploads
1. Provision S3 bucket `mediguide-x-patient-docs-mumbai` in `ap-south-1` with:
   - Server-Side Encryption enabled (KMS `aws/s3`).
   - Public access blocked completely.
   - CORS policy configured for local/prod web origins.
2. Build `app/services/s3.py`:
   - Method `generate_presigned_upload_url(filename: str, content_type: str) -> dict`: Returns pre-signed S3 PUT URL valid for 15 minutes.
   - Method `generate_presigned_read_url(s3_key: str) -> str`: Returns pre-signed GET URL valid for 60 minutes.

### Task 2.2: Clinical Context Engine (`services/context_engine.py`)
Build patient context assembler logic that pulls structured health context from PostgreSQL:
1. Fetch profile info (name, age derived from `date_of_birth`, gender, blood group).
2. Fetch list of active `medical_conditions` and `allergies`.
3. Fetch active medications from `medications` table (`is_active = True`).
4. Fetch summaries and extracted parameters from the latest 3 `medical_records`.
5. Fetch the last 3 chat message turns for the active `consultation_id`.
6. Format into compressed system prompt string (ensuring total context stays under **800 tokens**):
   ```text
   [PATIENT CONTEXT]
   Patient: Asha (Female, Age: 45) | Blood Group: B+
   Active Conditions: Type 2 Diabetes, Hypertension
   Allergies: Penicillin
   Current Medications: Metformin 500mg (Twice daily), Amlodipine 5mg (Once daily)
   Recent Labs:
     - CBC (2026-01-10): Hb 11.2 g/dL (Mildly Low), WBC 6500 /uL
     - HbA1c (2026-01-10): 7.8% (Elevated)
   Recent Dialogue:
     User: I feel dizzy after taking my morning medicine.
     AI: Check your blood pressure if possible and track when dizziness occurs...
   ```

### Task 2.3: Amazon Bedrock Nova Lite Integration (`services/bedrock.py`)
1. Implement `BedrockService` using `boto3.client("bedrock-runtime", region_name="ap-south-1")`.
2. Target Model: `amazon.nova-lite-v1:0`.
3. System Prompt Configuration:
   - Instruction: "You are Mediguide X, an empathetic AI healthcare assistant for Indian patients. Use patient context and general medical knowledge to provide clear explanations. Recommend when to consult a doctor. Do NOT provide a final medical diagnosis."
4. Temperature: `0.3` (Low temperature for consistent, grounded medical guidance).
5. Max Tokens: `1024`.

---

## 4. Input & Output Specs and Validation Rules

### Endpoint 1: `POST /api/v1/reports/upload-url`
- **Request Headers:** `Authorization: Bearer <JWT_ID_TOKEN>`
- **Input Pydantic Schema (`ReportUploadUrlRequest`):**
  ```python
  class ReportUploadUrlRequest(BaseModel):
      family_member_id: UUID
      title: str = Field(..., min_length=3, max_length=150)
      filename: str = Field(..., pattern=r"^[\w\-. ]+\.(pdf|png|jpg|jpeg)$")
      content_type: str = Field(..., pattern=r"^(application/pdf|image/png|image/jpeg)$")
      record_type: Literal["lab_report", "prescription", "vitals_summary", "other"]
      record_date: date
  ```
- **Validation Rules:**
  - File extension restricted to `.pdf`, `.png`, `.jpg`, `.jpeg`.
  - Content-Type must strictly match `application/pdf`, `image/png`, or `image/jpeg`.
- **Output Pydantic Schema (`ReportUploadUrlResponse`):**
  ```python
  class ReportUploadUrlResponse(BaseModel):
      record_id: UUID
      s3_key: str
      upload_url: str  # S3 Pre-signed PUT URL
      expires_in_seconds: int = 900
  ```
- **HTTP Status Codes:**
  - `200 OK`: Pre-signed URL generated.
  - `400 Bad Request`: Invalid file format or MIME type.
  - `403 Forbidden`: User does not own specified `family_member_id`.

### Endpoint 2: `GET /api/v1/reports/{family_member_id}`
- **Request Headers:** `Authorization: Bearer <JWT_ID_TOKEN>`
- **Output Pydantic Schema (`ReportListResponse`):**
  ```python
  class MedicalRecordItem(BaseModel):
      id: UUID
      title: str
      record_type: str
      record_date: date
      summary: Optional[str]
      download_url: str  # S3 Pre-signed GET URL
  
  class ReportListResponse(BaseModel):
      records: List[MedicalRecordItem]
  ```

### Endpoint 3: `POST /api/v1/consultations/{family_member_id}/messages`
- **Request Headers:** `Authorization: Bearer <JWT_ID_TOKEN>`
- **Input Pydantic Schema (`ChatMessageRequest`):**
  ```python
  class ChatMessageRequest(BaseModel):
      consultation_id: Optional[UUID] = None  # Creates new if null
      message: str = Field(..., min_length=1, max_length=2000)
  ```
- **Validation Rules:**
  - Message text length bounded between 1 and 2000 characters.
  - Mandatory ownership check on `family_member_id`.
- **Output Pydantic Schema (`ChatMessageResponse`):**
  ```python
  class ChatMessageResponse(BaseModel):
      consultation_id: UUID
      user_message: str
      ai_message: str
      suggestions: List[str]  # Dynamic follow-up chips
      disclaimer: str
      timestamp: str
  ```
- **HTTP Status Codes:**
  - `200 OK`: AI message generated and stored in DB.
  - `403 Forbidden`: Access denied to family member.
  - `502 Bad Gateway`: Bedrock service failure or timeout.

---

## 5. Acceptance Criteria & Verification Steps

1. **S3 File Upload Pipeline Test:**
   ```bash
   pytest tests/test_reports.py -k "test_upload_url"
   ```
   *Pass Criteria:* Client obtains pre-signed URL, uploads sample 1MB PDF via HTTP PUT, and verifies record entry in PostgreSQL `medical_records`.

2. **Context Engine Integration Test:**
   ```bash
   pytest tests/test_context_engine.py -v
   ```
   *Pass Criteria:* Context engine queries DB and builds structured prompt including patient age, active meds, and last lab report within token budget (< 800 tokens).

3. **Nova Lite Chat Test:**
   ```bash
   pytest tests/test_bedrock_chat.py -v
   ```
   *Pass Criteria:* Sending "What does my HbA1c result mean?" returns AI response referencing the 7.8% value from patient context in < 5 seconds.
