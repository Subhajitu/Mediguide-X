```md
# 00_Project_Foundation.md
**Mediguide X – AI Healthcare Companion for Indian Patients**  
**Version:** 1.0 (2026-08-13)  
**Author:** Lead Architect & Engineer

**Executive Summary:** Mediguide X is a web-based AI-driven health platform aimed at empowering Indian patients with personalized medical guidance while emphasizing professional medical consultation. The MVP will enable users to authenticate, manage family health profiles, upload medical reports, chat with an AI assistant about symptoms, and receive structured care guidance (AI Care Plans) based on their personal medical context. Core technologies include a React/TypeScript frontend, FastAPI backend, PostgreSQL (RDS), Amazon Cognito, S3, EC2, and Amazon Bedrock (Nova Lite/Pro models) for AI. A lightweight patient-centric RAG (Clinical Context Engine) will retrieve and encode personal health data (history, meds, reports) from PostgreSQL, while Nova provides general medical knowledge. We prioritize a modular architecture, security (data encryption, least-privilege IAM), and clear disclaimers, aiming for a deployable MVP in 7 days to practice AWS AI and Claude Architect skills.

## Goals
- **Patient-Focused AI:** Assist Indian patients with understandable health insights and care suggestions using personal medical data.
- **Family Health Management:** Single account can track multiple family members' health profiles.
- **Rapid MVP:** Deploy a working end-to-end prototype in 7 days emphasizing AWS AI services (Bedrock) and production readiness.
- **Education:** Align features with AWS AI Practitioner and Claude Architect certification objectives (e.g. prompt engineering, context management, AI safety).
- **Portfolio Quality:** Maintain clean code, modular design, proper documentation, and a real AWS deployment.

## Key Decisions (Alternatives Considered)
- **Hosting:** We choose EC2 (Ubuntu + Nginx) over serverless (Lambda/ECS) for simplicity and hands-on AWS skill building. (Rationale: full control, easy logging/monitoring, direct VM management; alternative ECS/Fargate adds container complexity, AWS Lambda limits may hinder a multi-step AI flow).
- **Frameworks:** React/TypeScript for frontend (matching UI design) and FastAPI for backend (Python familiarity, async support). Compared to Spring Boot, FastAPI yields faster iteration for Python AWS SDK use.
- **Database:** PostgreSQL on Amazon RDS for relational data (patient records, consultations). DynamoDB was considered but rejected because our data is structured and relational (patient-report linkage, complex queries). (Future: could consider Aurora Serverless or vector-augmented DB for scaling).
- **AI Models:** Amazon Nova Lite (low-latency, low-cost) and Nova Pro (higher-quality) for language understanding. Nova Lite handles rapid chat, Nova Pro used selectively for more complex queries.
- **Authentication:** Amazon Cognito (secure, scalable CIAM). It provides user pools, JWT tokens, and easy integration with frontend or FastAPI.
- **RAG (Retrieval):** **Patient-Centric RAG**: Store personal data (medical history, lab results, meds) in PostgreSQL; retrieve as context for every AI call. We do *not* initially build a general medical vector KB (Nova’s own knowledge covers that). Later we can add semantic search (e.g. OpenSearch/pgvector) for enhanced retrieval. (Aligns with RAG definition: use authoritative base to improve LLM output).
- **Security & Compliance:** Sensitive health data encrypted at rest (S3, RDS) and in transit (HTTPS). Follow Indian data norms: all data stored in India region, comply with DPDP Act 2023. Provide clear “AI Informational Assistant” disclaimers to avoid medical advice liability.

## Architecture Summary (see 02_Architecture.md)
We adopt a modular monolith deployed on a single EC2 (sized appropriately). Components include:
- **Frontend (React):** Deployed on Nginx, served via EC2.
- **Backend (FastAPI):** REST API with endpoints for auth, user profiles, reports, AI chat, etc.
- **Database (PostgreSQL):** Stores users, family members, medical records, chat history.
- **AI Service:** Backend calls Amazon Bedrock (Nova) for LLM responses using patient context prompts.
- **Storage (S3):** Holds uploaded reports (PDF, images), static assets.
- **Monitoring:** CloudWatch Logs/Alarms for API errors, EC2 health, AWS usage.

## Compliance & Safety
- **Medical Disclaimer:** Every AI response clearly marked as “AI-generated informational guidance. Consult a doctor for diagnosis or treatment.” Emphasize that Mediguide X is an assistant, not a substitute.
- **Data Residency:** Use AWS Asia Pacific (Mumbai) region to comply with India’s data localization trends.
- **Encryption:** Use HTTPS (ACM/TLS), encrypt S3/RDS via KMS.
- **Patient Privacy:** Only allow authenticated access to personal data; log accesses for audits.
- **Guardrails:** Filter prompts to prevent non-medical or harmful instructions. (E.g. disallow queries outside healthcare domain).

```

```md
# 01_Product_Requirements_Document.md

**Executive Summary:** Mediguide X is an AI-powered health companion for Indian patients to manage personal and family health information, understand medical data, and receive AI-generated care guidance (AI Care Plans) in plain language. Users can chat about symptoms, upload lab reports, review prescriptions, and receive structured follow-ups. It emphasizes personal context (medical history, labs) in AI responses (via a lightweight RAG system). The MVP targets India (English UI), web only, prioritizing rapid deployment and AWS services for learning.

## 1. Business Context
- **Problem:** Patients often find medical information confusing and lack personalized guidance. Doctors are busy and don’t always explain conditions clearly. A scalable AI companion can help patients interpret reports, recall history, and ask informed questions.
- **Solution:** Mediguide X provides a personalized health record system plus an AI chat assistant that answers questions using the patient’s own data and general medical knowledge. It supplements doctor visits by explaining lab values, meds, and suggesting next steps.
- **Market:** India’s digital health and telemedicine sector is growing. Many patients have smartphones but limited time; a free/basic AI service can educate and reassure.

## 2. Vision & Goals
- **Vision:** “Every patient deserves a trusted, intelligent companion to guide them through their health journey.”
- **Goals:**
  - Enable patients to build a health profile and store medical records.
  - Provide AI-powered explanations of symptoms, reports, and prescriptions.
  - Encourage active patient engagement (e.g., ask more accurate questions to doctors).
  - Demonstrate AWS AI Pract skills (Bedrock, Cognito, etc.) with a real app.
  - Deploy a working MVP by 7 days (Aug 20, 2026).

## 3. Stakeholders & Personas
- **Primary User:** Indian patients (20-60 yrs) with basic tech knowledge, managing their own or family’s health (Example: “Asha, 45, diabetic, Marathi speaker, moderately tech-savvy, wants clear guidance on lab results.”).
- **Other Users:** Family members (parents monitoring kids), doctors (future portal), but MVP focuses on patients.
- **Admin/Maintenance:** You (the developer) and potential future team.

## 4. User Journeys / Stories
1. **Sign Up / Onboard:**
   - User registers with email (or Google SSO via Cognito).
   - Creates personal profile, optionally adds family members (name, DOB, gender).
2. **Upload & View Reports:**
   - User uploads a lab report (PDF/photo).
   - System reads file name, may extract basic info; user tags it (e.g. “CBC - Jan 2026”).
   - AI can analyze it later in conversation.
3. **Medical Conversation:**
   - User chats: “I have headache and fever.”
   - System stores question, retrieves context (latest reports, history).
   - AI (Nova) responds: Checks symptom context, summarises likely causes, suggests actions.
   - E.g., “These symptoms could indicate a viral infection. Rest, hydrate, and monitor your temperature. If fever >3 days or severe headache, see a doctor. *This is informational and not a medical diagnosis.*”
4. **Lab Report Explanation:**
   - User asks: “Explain my CBC report results.”
   - AI retrieves values, highlights out-of-range items, explains each metric (in lay terms), and suggests concerns.
5. **Prescription Explanation:**
   - User enters medicines: “Metformin 500mg twice a day.”
   - AI explains what Metformin is for, common side-effects, diet advice.
6. **Generate Care Plan:**
   - AI summarizes conversation, lists next steps (e.g. “Get a sleep study”, “Review in 1 week”), lists any red flags.
7. **Follow-up:**
   - User asks clarifying Q’s (“Why is my A1C high?”), AI references earlier answers/context for continuity.
8. **Data Management:**
   - Users can view their timeline: Past questions, AI answers, reports, meds logged.
   - Edit profile/family details.

## 5. Features (MVP Scope)
### Core Features
- **Authentication:** Sign up/login (email+password, optional Google) via Amazon Cognito.
- **User Profile:** Personal info (age, sex, conditions, allergies) and family member management.
- **Health Timeline:** Chronological list of past AI consultations, uploaded reports, medications.
- **Report Upload:** Upload PDF or image (JPEG/PNG) to S3; link in DB.
- **AI Consultation:** Chat interface (text only) with context passing. Each message triggers backend call to Amazon Nova through FastAPI.
- **Context Retrieval (Patient RAG):** Backend gathers user’s profile, history, last labs, current meds, etc., and prefaces AI prompts with this context.
- **Nova Models:** Use Nova Lite by default (fast/cost-effective) and Nova Pro for longer/more critical analysis (configurable).
- **Structured Responses:** AI outputs in JSON with fields (e.g., “SymptomAnalysis”, “Recommendations”).
- **Care Plan Generation:** After conversation, AI produces a summarized plan (symptoms, possible causes, next steps).
- **Medical Safety:** Filter user input for non-medical content; always include a disclaimer in responses. (E.g., "*I am not a doctor, this is for informational purposes.*")
- **Monitoring:** Log AI queries/responses, errors to CloudWatch.

### Out of Scope (Phase 1)
- Voice interface, multilingual support (English only), telemedicine booking, doctor portal.
- Complex RAG (no vector DB yet).
- Payment or advanced CI/CD beyond GitHub Actions.
- Offline/Native mobile app.

## 6. Functional Requirements
- **FR1:** The system shall allow users to create an account (email/Social, password or OAuth).
- **FR2:** The system shall authenticate users via AWS Cognito and issue JWT tokens.
- **FR3:** Users can create and manage family member profiles.
- **FR4:** Users can upload medical reports (PDF, image) which are stored in Amazon S3.
- **FR5:** Backend shall parse (or later OCR) uploaded reports for key data (optional initial step).
- **FR6:** Users can chat with AI: UI sends message to backend; backend sends prompt to Amazon Bedrock/Nova with user context and returns response.
- **FR7:** AI responses shall use personal context (from RDS) and general medical knowledge (Nova).
- **FR8:** System shall store every Q&A in DB for history.
- **FR9:** AI responses include clear disclaimers.
- **FR10:** Provide a page to display "Health Overview" summarizing latest vitals/reports/conditions.
- **FR11:** All sensitive data in transit must be encrypted (HTTPS); at rest encryption on S3/RDS.
- **FR12:** Admin/Dev tools: Health monitoring via CloudWatch dashboards.

## 7. Non-Functional Requirements
- **NFR1 (Performance):** Chat responses <5 seconds after prompt (depending on model).
- **NFR2 (Scalability):** Support at least 50 concurrent users on EC2 t3.medium (for MVP).
- **NFR3 (Security):** OWASP best practices, HTTPS only, Cognito-auth protected APIs.
- **NFR4 (Reliability):** 95% uptime for MVP (thanks to EC2 & RDS).
- **NFR5 (Maintainability):** Code follows PEP8/TypeScript linting; Docker-friendly deployment.
- **NFR6 (Compliance):** Data storage in AWS Mumbai region (data residency). Informational only, no FDA/ICMR certification (explicit disclaimers).
- **NFR7 (Usability):** Simple UI, mobile-responsive.
- **NFR8 (Cost):** Use AWS Free Tier services where possible, keep model usage to under 1000 tokens/query.

## 8. AI Specifications
- **Contexts:** Include user profile (age, gender, existing conditions), last 3 consultations (Q&A), latest lab report values, current meds.
- **Prompt Strategy:** Chain-of-thought style to replicate clinical reasoning. Example:
  ```
  You are an AI medical assistant. Patient is 45-year-old male, BMI 25, diabetic. Latest labs: A1C 7.8%. Current meds: Metformin 500mg x2 daily. Chief complaint: "I feel very thirsty".
  [System Task] Analyze symptoms with context and give advice.
  ```
- **Models:** Default to Nova Lite (`amazon.nova-lite-v1:0`) for chat. Switch to Nova Pro (`amazon.nova-pro-v1:0`) for structured tasks (e.g. lab analysis) or if user toggles “High-quality mode”.
- **Output Format:** JSON with fields like `analysis`, `recommendations`, `questions` for follow-up, `carePlan`.
- **Guardrails:** If question is non-medical, respond with a polite redirect: "*I am a medical assistant focused on health-related queries.*"

## 9. Acceptance Criteria
- Users can sign up/login and get a JWT (verify via Cognito).
- Uploading a PDF creates an S3 object and an entry in PostgreSQL.
- Chatting with AI yields a structured JSON response with relevant medical info (tested with sample prompts).
- Evidence of CloudWatch logging API calls and errors.
- Demo scenario: Upload blood report, ask a health question, receive context-aware answer with disclaimer.

## 10. Future Enhancements (Beyond MVP)
- Multilingual support (Hindi, etc.).
- Vector-based semantic RAG (pgvector or OpenSearch) for large reference corpora.
- Doctor portal and appointment booking.
- Telemedicine integration.
- Mobile apps (React Native).
- Advanced analytics (health trends, alerts).

## 11. Risks & Mitigations
- **ML Output Quality:** LLM hallucinations. *Mitigation:* Use RAG context, multiple models (Lite vs Pro), human-in-the-loop review.
- **Security Breach:** Data leak. *Mitigation:* Strong IAM, encryption, minimal privileges.
- **Regulatory:** Giving advice. *Mitigation:* Medical disclaimer, restrict to info-only.
- **Time:** Tight 7-day schedule. *Mitigation:* Focus MVP features, iterative dev with CI/CD.

**Sources:** Core architecture drawn from AWS best practices. Amazon Nova details; Cognito features; RAG concept.