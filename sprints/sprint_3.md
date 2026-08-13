# Sprint 3 Detailed Execution Plan
**Module:** Advanced AI Reasoning, Care Plan Generation & Safety Guardrails  
**Target Duration:** Days 5–6  
**Prerequisites:** Completed Sprint 2, AWS Bedrock Nova Pro Access Enabled  

---

## 1. Objective & Scope
Implement Multimodal report analysis using Amazon Nova Pro (`amazon.nova-pro-v1:0`) to parse medical reports directly from S3, create structured AI Care Plans backed by Pydantic JSON schemas, enforce Chain-of-Thought (CoT) prompt reasoning, and embed safety guardrails and disclaimers.

---

## 2. Technical Architecture & Component Layout

```
backend/app/
├── api/v1/endpoints/
│   ├── care_plan.py           # Care plan generation & retrieval APIs
│   └── report_analysis.py     # Multimodal Nova Pro analysis trigger API
├── core/
│   └── guardrails.py          # Medical safety classifier & disclaimer logic
├── services/
│   ├── report_analyzer.py     # Nova Pro Multimodal document parsing
│   └── care_plan.py           # Care plan generation engine
└── schemas/
    └── care_plan.py           # Strict Pydantic JSON output schemas
```

---

## 3. Step-by-Step Task Breakdown

### Task 3.1: Amazon Nova Pro Multimodal Lab Report Analyzer
1. Build `app/services/report_analyzer.py`:
   - Fetch document binary bytes directly from S3.
   - Package image/PDF payload for `amazon.nova-pro-v1:0` in Bedrock.
   - Send prompt:
     ```text
     Analyze this uploaded medical lab report image/document. Extract all lab parameters into a structured JSON dictionary. For each parameter include: 'name', 'value', 'unit', 'reference_range', and 'is_out_of_range' (boolean). Also provide a brief 2-sentence layperson summary.
     ```
   - Store extracted parameters in `medical_records.extracted_data` JSONB column in PostgreSQL.

### Task 3.2: Dual-Model Router & Chain-of-Thought (CoT) Engine
1. Implement Model Router in `services/bedrock.py`:
   - Route simple chat turns to Nova Lite (`amazon.nova-lite-v1:0`) for low latency.
   - Route complex tasks (lab document parsing, structured Care Plan creation) to Nova Pro (`amazon.nova-pro-v1:0`).
2. Implement Chain-of-Thought System Prompt Template:
   ```text
   Step 1: Review Patient Context (age, gender, existing conditions, active medications).
   Step 2: Evaluate Chief Complaint / User Prompt against clinical knowledge.
   Step 3: Identify potential red flag symptoms requiring immediate emergency care.
   Step 4: Formulate conservative home care guidance and questions for clinician review.
   Step 5: Output structured response adhering strictly to requested JSON schema.
   ```

### Task 3.3: Structured AI Care Plan Generator
1. Build `app/services/care_plan.py`:
   - Endpoint: `POST /api/v1/consultations/{consultation_id}/care-plan`.
   - Aggregate entire consultation transcript + patient context.
   - Call Nova Pro requesting output strictly matching Pydantic schema `CarePlanSchema`.
   - Add robust JSON repair parser: strip markdown fence blocks (````json ... ````) and parse clean dict.
   - Persist generated Care Plan in `consultations.care_plan_summary`.

### Task 3.4: Safety Guardrails & Disclaimer Enforcer
1. Build `app/core/guardrails.py`:
   - **Non-Medical Classifier:** Keyword & lightweight zero-shot prompt filter checking if user input is non-medical (e.g. asking for software code, investment advice).
   - If non-medical, abort LLM call and return polite redirect:  
     *"I am Mediguide X, an AI health assistant focused exclusively on medical and wellness guidance. Please ask a health-related question."*
   - **Mandatory Disclaimer Enforcer (`FR9`):** Append disclaimer to every AI output:  
     *"Disclaimer: Mediguide X provides AI-generated informational guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns."*

---

## 4. Input & Output Specs and Validation Rules

### Endpoint 1: `POST /api/v1/reports/{record_id}/analyze`
- **Request Headers:** `Authorization: Bearer <JWT_ID_TOKEN>`
- **Output Pydantic Schema (`ReportAnalysisResponse`):**
  ```python
  class LabParameter(BaseModel):
      name: str
      value: str
      unit: Optional[str]
      reference_range: Optional[str]
      is_out_of_range: bool

  class ReportAnalysisResponse(BaseModel):
      record_id: UUID
      summary: str
      extracted_parameters: List[LabParameter]
  ```

### Endpoint 2: `POST /api/v1/consultations/{consultation_id}/care-plan`
- **Request Headers:** `Authorization: Bearer <JWT_ID_TOKEN>`
- **Output Pydantic Schema (`CarePlanSchema`):**
  ```python
  class CarePlanSchema(BaseModel):
      symptom_summary: str = Field(..., description="Summary of presented symptoms")
      possible_causes: List[str] = Field(..., min_items=1, description="Differential educational possibilities")
      recommended_actions: List[str] = Field(..., min_items=1, description="Actionable non-diagnostic guidance")
      red_flags: List[str] = Field(..., description="Emergency warning symptoms requiring immediate care")
      questions_for_doctor: List[str] = Field(..., description="Questions patient can ask their physician")
      disclaimer: str
  ```
- **Validation Rules:**
  - Strict Pydantic parsing: `possible_causes` and `recommended_actions` must contain at least 1 non-empty item.
  - `disclaimer` field must be present and non-empty.
- **HTTP Status Codes:**
  - `200 OK`: Care plan successfully generated and stored.
  - `404 Not Found`: Consultation ID does not exist.
  - `422 Unprocessable Entity`: AI output failed JSON schema validation after repair attempt.

---

## 5. Acceptance Criteria & Verification Steps

1. **Nova Pro Multimodal Document Parsing Test:**
   ```bash
   pytest tests/test_report_analyzer.py -v
   ```
   *Pass Criteria:* Sample blood test PNG processed by Nova Pro extracts parameters (Hb, WBC, Platelets) into PostgreSQL with `is_out_of_range` booleans set correctly.

2. **Care Plan Generator Test:**
   ```bash
   pytest tests/test_care_plan.py -v
   ```
   *Pass Criteria:* Invoking care plan endpoint creates complete `CarePlanSchema` JSON with all 5 required fields populated and stored in DB.

3. **Guardrails & Disclaimer Test:**
   ```bash
   pytest tests/test_guardrails.py -v
   ```
   *Pass Criteria:* Non-medical query ("Write a Python script for web scraping") returns standard redirect message; valid symptom query includes mandatory disclaimer text.
