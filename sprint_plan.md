# Mediguide X – 5-Sprint Implementation Plan

**Project:** Mediguide X – AI Healthcare Companion for Indian Patients  
**Version:** 1.0  
**Date:** 2026-08-13  
**Target Delivery Window:** 7-Day MVP Execution Plan  

---

## Executive Overview
This document outlines a structured, 5-Sprint implementation roadmap for **Mediguide X**. The plan transitions the application from its current frontend mock state into a fully functional, production-deployed AWS AI Healthcare platform. Each sprint focuses on delivering end-to-end value across the stack while aligning with AWS AI Practitioner and Claude Architect standard patterns.

```
       Sprint 1                Sprint 2                Sprint 3                Sprint 4                Sprint 5
+---------------------+ +---------------------+ +---------------------+ +---------------------+ +---------------------+
|  FastAPI Foundation | | S3 Storage & Patient| | Bedrock AI & CoT    | | Frontend Connection | | AWS Deployment &    |
|  PostgreSQL Schema  | | Context RAG Engine  | | Care Plan & Safety  | | Auth / Family State | | CloudWatch / E2E    |
|  AWS Cognito Auth   | | (Nova Lite Model)   | | (Nova Pro Model)    | | Full UI Integration | | Production Polish   |
+---------------------+ +---------------------+ +---------------------+ +---------------------+ +---------------------+
```

---

## Sprint Breakdown

### Sprint 1: Backend Foundation, PostgreSQL Schema & AWS Cognito Authentication
**Objective:** Establish the FastAPI backend architecture, design and migrate the PostgreSQL database schema, and integrate AWS Cognito JWT authentication.

#### Key Tasks
1. **FastAPI Project Structure Setup**
   - Initialize Python project with standard layout (`app/api/v1/`, `app/core/`, `app/db/`, `app/models/`, `app/services/`).
   - Configure dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `pydantic`, `boto3`, `python-jose`).
   - Setup environment configuration management via Pydantic Settings (`.env` validation).
2. **PostgreSQL Database Modeling**
   - Create relational schema:
     - `users` (id, cognito_sub, email, full_name, created_at)
     - `family_members` (id, user_id, name, relationship, dob, gender, blood_group, conditions, allergies)
     - `medical_records` (id, family_member_id, title, record_type, file_s3_key, summary, extracted_data, record_date)
     - `medications` (id, family_member_id, name, dosage, frequency, status)
     - `consultations` (id, family_member_id, title, care_plan_summary, created_at)
     - `chat_messages` (id, consultation_id, sender, text, structured_json, timestamp)
   - Setup Alembic migration scripts and test database connections.
3. **AWS Cognito Integration**
   - Provision AWS Cognito User Pool and Client App in `ap-south-1` (Mumbai).
   - Implement Auth Middleware in FastAPI to validate Cognito JWT bearer tokens.
   - Create REST endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.

#### Deliverables
- Working FastAPI service with running database migrations.
- Secure JWT authentication middleware verified against AWS Cognito.
- Swagger API documentation available at `/docs`.

#### Acceptance Criteria
- [ ] User can register and authenticate against AWS Cognito and receive a valid JWT token.
- [ ] Protected endpoints return `401 Unauthorized` without a valid token.
- [ ] Database schema deploys cleanly via Alembic with foreign key constraints.

---

### Sprint 2: S3 Document Pipeline & Patient Context RAG Engine
**Objective:** Enable medical report uploading to AWS S3 and construct the Clinical Context Engine (Patient-Centric RAG) backed by Amazon Nova Lite.

#### Key Tasks
1. **AWS S3 Document Pipeline**
   - Provision Amazon S3 bucket (`mediguide-x-patient-docs-mumbai`) with KMS encryption and bucket privacy policies.
   - Build document upload endpoint (`POST /api/v1/reports/upload`) supporting PDF and PNG/JPEG files.
   - Implement pre-signed URL generation or direct streaming upload to S3.
   - Store report metadata and S3 URI reference in PostgreSQL (`medical_records`).
2. **Clinical Context Engine (Patient RAG)**
   - Build a contextual retrieval service (`ContextEngine`) that gathers:
     - Patient profile (age, gender, known chronic conditions, allergies).
     - Active medications from PostgreSQL.
     - Latest lab report summaries & extracted metric values.
     - Recent consultation history (last 3 conversation turns).
   - Format context into a structured prompt preface for LLM injection.
3. **Amazon Bedrock Nova Lite Integration**
   - Integrate `boto3` Bedrock Runtime client configured for `amazon.nova-lite-v1:0`.
   - Implement chat endpoint (`POST /api/v1/consultations/{id}/messages`) that retrieves context, formats prompt, invokes Nova Lite, and returns streaming or structured responses.
   - Log query timing and prompt token usage metrics.

#### Deliverables
- S3 upload pipeline with validated file constraints.
- Patient Context Assembly module extracting live medical records from RDS.
- AI Chat endpoint executing Amazon Nova Lite queries with personal patient context.

#### Acceptance Criteria
- [ ] Uploaded lab report PDF correctly saved in S3 with record entry in PostgreSQL.
- [ ] AI chat response demonstrates awareness of user profile (e.g., age, diabetic status, active meds).
- [ ] Response latency for standard chat turn remains < 5 seconds (`NFR1`).

---

### Sprint 3: Advanced AI Reasoning, Care Plan Generation & Safety Guardrails
**Objective:** Implement Chain-of-Thought (CoT) prompt engineering, Amazon Nova Pro integration for structured care plans, and medical safety guardrails.

#### Key Tasks
1. **Chain-of-Thought (CoT) & Model Routing**
   - Design CoT system prompts encouraging clinical reasoning step-by-step (Symptom analysis -> Context review -> Differential considerations -> Actionable advice).
   - Implement multi-model router: route rapid chat to Nova Lite (`amazon.nova-lite-v1:0`) and complex report explanations / care plan generation to Nova Pro (`amazon.nova-pro-v1:0`).
2. **Structured AI Care Plan Generation**
   - Create Care Plan API (`POST /api/v1/consultations/{id}/care-plan`).
   - Instruct Nova Pro to output strict JSON matching Pydantic schema:
     - `symptom_summary`: String
     - `possible_causes`: List[String]
     - `recommended_actions`: List[String]
     - `red_flags`: List[String]
     - `questions_for_doctor`: List[String]
   - Persist Care Plan summary in `consultations` database table.
3. **Medical Safety & Non-Medical Guardrails**
   - Add prompt classifier to detect non-medical or off-topic queries, responding with standard redirect text.
   - Enforce mandatory appending of Indian medical disclaimers (`FR9`) to all outgoing AI messages.
   - Sanitize AI JSON responses before sending to client.

#### Deliverables
- Prompt engineering library with CoT templates.
- Nova Pro model integration for structured output parsing.
- Care Plan generation engine with automated database persistence.
- Safety guardrail filter enforcing disclaimers and domain boundary limits.

#### Acceptance Criteria
- [ ] AI Care Plan generates valid, parseable JSON containing all required fields.
- [ ] Non-medical prompts (e.g., asking for coding code or financial advice) receive standard medical redirect.
- [ ] Every AI output contains the explicit medical disclaimer text.

---

### Sprint 4: Frontend State Management & Complete API Integration
**Objective:** Replace hardcoded mock data in the React/TypeScript frontend with real state management connected to FastAPI REST endpoints.

#### Key Tasks
1. **API Client & Authentication State**
   - Create Axios / Fetch API client (`src/services/api/`) with automatic Authorization header injection (JWT).
   - Implement Auth Context (`AuthContext.tsx`) managing user login, signup, token storage, and session refresh.
   - Add Login/Register UI modal or view.
2. **Real-time Consultation Chat Integration**
   - Replace mock replies in `App.tsx` with async API calls to `/api/v1/consultations`.
   - Update `ChatView.tsx` and `ChatInput.tsx` to handle loading states, typing indicators, and real backend responses.
   - Display AI suggestions dynamically returned from the backend.
3. **Family Member Profile Management**
   - Add Family Member selector dropdown in top navigation or sidebar.
   - Build UI modal to create/edit family profiles (Name, Relationship, DOB, Gender, Medical Conditions).
   - Filter chat history and health panel metrics based on active selected family member.
4. **Report Upload & Right Health Panel Integration**
   - Connect file upload input in UI to backend `/api/v1/reports/upload`.
   - Update `RightHealthPanel.tsx` to render real health metrics and uploaded lab report links fetched from PostgreSQL.

#### Deliverables
- Fully dynamic React application without dependency on static mock files.
- Complete Auth lifecycle (Login -> Authenticated Session -> Logout).
- Dynamic Family Member switching and report upload UI.

#### Acceptance Criteria
- [ ] User can log in, select a family profile, send a message, and receive live AI responses from Bedrock.
- [ ] Uploading a PDF report updates the UI timeline and health panel in real-time.
- [ ] Switching family profiles updates all messages, medical history, and metrics accordingly.

---

### Sprint 5: Production Deployment, Security, Monitoring & E2E Verification
**Objective:** Deploy Mediguide X to AWS EC2 in `ap-south-1`, configure HTTPS/KMS security, set up CloudWatch monitoring, and execute full end-to-end verification.

#### Key Tasks
1. **AWS EC2 Production Setup**
   - Launch Ubuntu EC2 instance (`t3.medium`) in AWS Mumbai region within target VPC.
   - Configure Security Groups (Ports 80, 443, 22).
   - Install and configure Nginx as reverse proxy serving React static build and proxying `/api` to FastAPI (Uvicorn systemd service).
2. **Security Hardening & Compliance**
   - Configure SSL/TLS certificate via AWS Certificate Manager / Let's Encrypt.
   - Enable KMS encryption for S3 buckets and RDS PostgreSQL database instances.
   - Audit IAM roles ensuring least-privilege access for EC2 to Bedrock, S3, and CloudWatch.
3. **AWS CloudWatch Monitoring & Dashboard**
   - Configure CloudWatch Agent on EC2 to export application logs (`/var/log/nginx/`, FastAPI logs).
   - Create CloudWatch Dashboard tracking:
     - HTTP 2xx/4xx/5xx API rates.
     - Bedrock Nova Lite & Pro token consumption and invocation counts.
     - EC2 CPU and RAM utilization.
   - Set up CloudWatch Alarm for high error rate (> 5% in 5 min).
4. **End-to-End Testing & Final Acceptance Verification**
   - Execute test scripts covering PRD User Journeys 1 through 8.
   - Perform cross-browser and mobile responsive checks.
   - Conduct security scan (Oxlint, OWASP top 10 review).

#### Deliverables
- Live, accessible production deployment on EC2 with HTTPS.
- Active CloudWatch dashboard and alarm configuration.
- Comprehensive end-to-end test run report proving MVP readiness.

#### Acceptance Criteria
- [ ] Live application accessible over HTTPS with clean SSL certificate.
- [ ] CloudWatch displays active log streams and metric graphs for Bedrock and API requests.
- [ ] Complete user flow (Signup -> Add Family Member -> Upload Report -> Chat with AI -> View Care Plan) passes end-to-end without errors.

---

## Summary Matrix of Sprints

| Sprint | Primary Focus | Core Technologies | Primary Deliverable |
| :--- | :--- | :--- | :--- |
| **Sprint 1** | Backend Foundation & Auth | FastAPI, PostgreSQL, Alembic, AWS Cognito | Authenticated REST API & DB Schema |
| **Sprint 2** | Storage & Patient RAG | AWS S3, boto3, Amazon Nova Lite | Context-aware AI Chat & Report Upload |
| **Sprint 3** | Advanced AI & Safety | Amazon Nova Pro, CoT Prompts, Guardrails | Structured Care Plans & Safety Filters |
| **Sprint 4** | Frontend Integration | React 19, TypeScript, Axios/Context API | Complete Connected Web Application |
| **Sprint 5** | Deployment & Operations | AWS EC2, Nginx, CloudWatch, KMS | Production Live MVP & Monitoring |
