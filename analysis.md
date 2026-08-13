# Mediguide X – Gap Analysis & Architectural Assessment

**Project:** Mediguide X – AI Healthcare Companion for Indian Patients  
**Version:** 1.0  
**Date:** 2026-08-13  
**Status:** Pre-Implementation Review  

---

## 1. Executive Summary
This document provides a comprehensive technical gap analysis between the existing codebase state and the product goals defined in `Planv1.md`. It identifies potential technical blockers, missing backend components, architectural improvements, and security considerations required to achieve a production-ready MVP.

---

## 2. Codebase Audit vs. Target Requirements

### 2.1 Current Codebase State
- **Frontend Framework:** React 19 (`react: ^19.2.8`), TypeScript (`~6.0.2`), and Vite (`^8.2.0`).
- **UI Architecture:** Well-structured component modularization (`features/ai-consultation`, `features/health-metrics`, `shared/layouts`, `shared/ui`).
- **Data Layer:** Entirely driven by static mock data (`src/services/mockData.ts`) and local React state with simulated `setTimeout` delays in `App.tsx`.
- **Backend Infrastructure:** **0% implemented**. No Python/FastAPI environment, no API routes, no database schema or connection logic.
- **AWS Cloud Resources:** **0% provisioned**. No Cognito User Pool, S3 buckets, RDS PostgreSQL database, EC2 instances, or Bedrock IAM configurations in place.

### 2.2 Functional Gap Analysis

| Feature / Requirement | Current Codebase Status | Target Requirement (`Planv1.md`) | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Authentication (`FR1`, `FR2`)** | Non-existent; static layout rendered without auth context. | Amazon Cognito integration with JWT validation. | **High** |
| **Family Profiles (`FR3`)** | Static mock UI representation only. | DB-backed 1:N family member management & context switching. | **Medium** |
| **Report Upload & Storage (`FR4`)** | Mock attachment badges in static chat messages. | S3 document upload pipeline (PDF/Image) with KMS encryption. | **High** |
| **Patient Context RAG (`FR7`)** | None; mock replies use static string arrays. | Context engine retrieving profile, meds, labs, and turns from PostgreSQL. | **Critical** |
| **Amazon Bedrock AI (`FR6`)** | Simulated timer returning fixed strings. | Live `boto3` calls to Nova Lite (`nova-lite-v1:0`) and Nova Pro (`nova-pro-v1:0`). | **Critical** |
| **Structured Care Plans (`FR10`)** | None. | AI-generated JSON care plan persisted to DB and displayed in UI. | **High** |
| **Medical Safety Guardrails (`FR9`)** | Static footer text in UI. | Active prompt filtering, medical disclaimers, and non-medical query handling. | **High** |
| **CloudWatch & Ops (`FR12`)** | None. | Logging, error tracking, and latency metrics in AWS CloudWatch. | **Medium** |

---

## 3. Key Blockers & Technical Dependencies

### Blocker 1: AWS Bedrock Amazon Nova Model Access
- **Issue:** Amazon Nova Lite (`amazon.nova-lite-v1:0`) and Nova Pro (`amazon.nova-pro-v1:0`) must be explicitly requested and enabled in the AWS Management Console under Bedrock Model Access.
- **Impact:** Without active model access approval in the target region (`ap-south-1` Mumbai or designated fallback region), Bedrock API calls will fail with `AccessDeniedException`.
- **Mitigation:** Execute AWS Bedrock model access request immediately prior to Sprint 2 development. Provide fallback logic to `us-east-1` if Nova models are restricted in `ap-south-1`.

### Blocker 2: Document Parsing & Extraction Strategy
- **Issue:** Uploading PDF lab reports or images requires extracting key text/values (e.g., A1C, Hemoglobin) to populate PostgreSQL medical records and feed the Clinical Context Engine.
- **Impact:** Raw binary files stored in S3 cannot be directly read by LLM prompts without an extraction layer.
- **Mitigation:** Utilize Amazon Nova Pro's native multimodal capabilities (passing PDF/Image document tokens directly to Bedrock) or integrate AWS Textract / PyPDF parser in FastAPI backend to extract plain text prior to context assembly.

### Blocker 3: AWS Cognito Multi-Tenant Family Context Isolation
- **Issue:** Cognito accounts map 1:1 with primary users (email/password). However, `Planv1.md` requires tracking health records for multiple family members under a single account.
- **Impact:** If DB queries fail to filter by `family_member_id`, medical context from one family member could leak into another's AI consultation.
- **Mitigation:** Implement strict relational scoping in PostgreSQL (`users` -> `family_members` -> `medical_records` / `consultations`). Require `family_member_id` as a mandatory path parameter in all consultation API routes.

### Blocker 4: Data Residency & Compliance (India DPDP Act 2023)
- **Issue:** Health data must strictly adhere to Indian data localization trends and DPDP Act compliance.
- **Impact:** Provisioning AWS resources outside `ap-south-1` (Mumbai) without encryption could breach regulatory guidelines.
- **Mitigation:** Standardize all AWS deployments (RDS, S3, Cognito) to the `ap-south-1` region. Enable KMS encryption at rest across S3 and RDS.

---

## 4. Required Architectural Improvements

### 4.1 Recommended FastAPI Backend Project Architecture
Create a clean, scalable modular layout under a new `backend/` directory:

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── family.py
│   │       │   ├── reports.py
│   │       │   ├── consultation.py
│   │       │   └── care_plan.py
│   │       └── router.py
│   ├── core/
│   │   ├── config.py          # Environment settings (Pydantic)
│   │   ├── security.py        # Cognito JWT verification
│   │   └── guardrails.py      # Medical safety & prompt filters
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py         # SQLAlchemy async engine
│   │   └── models/            # ORM models (User, FamilyMember, etc.)
│   ├── schemas/               # Pydantic request/response validation
│   ├── services/
│   │   ├── bedrock.py         # Amazon Nova Lite/Pro boto3 wrapper
│   │   ├── s3.py              # AWS S3 upload & pre-signed URL generator
│   │   └── context_engine.py  # Patient RAG context assembler
│   └── main.py                # FastAPI initialization & CORS
├── alembic/                    # Database migration scripts
├── requirements.txt
└── Dockerfile
```

### 4.2 Frontend State & Auth Architecture
- **State Management:** Introduce React Context (`AuthContext` and `PatientContext`) or Zustand to manage global authentication tokens, active family member selection, and active consultation session.
- **API Client:** Create a unified Axios instance with request/response interceptors to attach `Authorization: Bearer <token>` and globally catch `401 Unauthorized` or network errors.
- **Error Boundaries & Toast Notifications:** Add React Error Boundaries and toast notification banners for network failures or S3 upload errors.

### 4.3 Patient RAG Prompt Engineering & Context Budgeting
To satisfy `NFR8` (keeping token usage < 1000 tokens per query) while delivering rich personal context:
- **Trimming Strategy:** The `ContextEngine` should format personal context concisely into key-value sections:
  ```text
  [PATIENT CONTEXT]
  Age/Sex: 45M | Conditions: Type 2 Diabetes | Allergies: Penicillin
  Active Meds: Metformin 500mg BD
  Latest Labs (Jan 2026): HbA1c 7.8% (High), Fasting Blood Sugar 132 mg/dL
  Recent Turns: User queried about feeling excessively thirsty.
  ```
- **CoT Structure:** Enforce Chain-of-Thought reasoning steps in the prompt system text to guarantee clinical accuracy before generating final output.

### 4.4 Robust JSON Response Parsing for Care Plans
- LLM outputs can occasionally contain extra markdown formatting (e.g., ```json ... ```) or minor syntax errors.
- **Improvement:** Implement a robust JSON cleaner in `services/bedrock.py` that strips markdown code blocks and validates output against Pydantic schemas before returning to the frontend.

---

## 5. Risk Assessment & Mitigation Matrix

| Risk Event | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Bedrock API Latency Exceeds 5s** | Medium | Medium | Use Nova Lite by default; implement streaming responses (Server-Sent Events) for real-time typing feedback in UI. |
| **Hallucinated Medical Advice** | High | Low | Inject strong clinical CoT system prompts, enforce patient context RAG, and append mandatory disclaimers. |
| **S3 Direct Upload Vulnerability** | High | Low | Use S3 pre-signed URLs with restricted MIME types (PDF, PNG, JPEG) and maximum file size limits (10MB). |
| **CORS / Pre-flight Failures** | Low | Medium | Configure FastAPI CORS Middleware explicitly for target frontend origins in both development and production Nginx. |

---

## 6. Recommendations & Immediate Next Steps

1. **AWS Infrastructure Initialization:**
   - Request Amazon Nova Lite & Nova Pro model access in AWS Bedrock.
   - Create AWS Cognito User Pool & App Client in `ap-south-1`.
   - Provision S3 bucket and RDS PostgreSQL instance (or local Docker PostgreSQL for Sprint 1 dev).
2. **Backend Scaffold Creation:**
   - Initialize `backend/` directory with Python virtual environment (`venv`), FastAPI, SQLAlchemy, and Alembic.
3. **Frontend Integration Preparation:**
   - Prepare Axios client and AuthContext skeleton in `src/` to receive Sprint 1 auth endpoints.
