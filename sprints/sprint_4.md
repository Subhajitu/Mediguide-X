# Sprint 4 Detailed Execution Plan
**Module:** Frontend State Management & Complete API Integration  
**Target Duration:** Days 7–8  
**Prerequisites:** Completed Sprints 1–3, Running FastAPI Backend  

---

## 1. Objective & Scope
Replace all static mock data (`src/services/mockData.ts`) in the React 19 / TypeScript frontend with live API integrations. Implement `AuthContext` and `PatientContext`, add dynamic Family Member profile management, enable direct S3 file uploads from the UI, and connect live Bedrock chat consultations.

---

## 2. Technical Architecture & Component Layout

```
src/
├── app/
│   ├── App.tsx                     # Main layout wired to Auth & Patient context
│   └── App.css
├── context/
│   ├── AuthContext.tsx             # Auth state (Cognito JWT, Login, Logout, User info)
│   └── PatientContext.tsx          # Active family member, health profile, & refresh triggers
├── services/
│   └── api/
│       ├── client.ts               # Axios instance with auth interceptor
│       ├── authApi.ts              # Auth endpoints
│       ├── familyApi.ts            # Family profiles endpoints
│       ├── reportsApi.ts           # Upload presigned URL & list endpoints
│       └── consultationApi.ts      # Chat & care plan endpoints
├── features/
│   ├── ai-consultation/
│   │   ├── ChatView.tsx            # Live message stream rendering
│   │   ├── ChatInput.tsx           # Input box & dynamic suggestion chips
│   │   └── CarePlanModal.tsx       # AI Care Plan popup modal
│   └── health-metrics/
│       └── RightHealthPanel.tsx    # Live DB-driven metrics & report links
├── shared/
│   └── components/
│       ├── FamilySelectorModal.tsx # Add/Edit family member modal
│       └── AuthModal.tsx           # Login / Register UI modal
```

---

## 3. Step-by-Step Task Breakdown

### Task 4.1: API Client Layer & Auth Context
1. Create `src/services/api/client.ts`:
   - Configure Axios base URL pointing to `import.meta.env.VITE_API_BASE_URL` (default `http://localhost:8000`).
   - Add request interceptor injecting header `Authorization: Bearer ${accessToken}` if present.
   - Add response interceptor redirecting to login on `401 Unauthorized`.
2. Implement `src/context/AuthContext.tsx`:
   - Manage state: `user`, `accessToken`, `isAuthenticated`, `isLoading`.
   - Provide methods: `login(email, password)`, `register(email, password, fullName)`, `logout()`.
   - Persist JWT securely in `localStorage` / `sessionStorage` and restore on page refresh.

### Task 4.2: Family Member State Management (`PatientContext.tsx`)
1. Implement `src/context/PatientContext.tsx`:
   - Manage state: `familyMembers`, `activeFamilyMember`, `activeConsultationId`.
   - Provide methods: `selectFamilyMember(id)`, `addFamilyMember(data)`, `refreshReports()`.
2. Build `FamilySelectorModal.tsx`:
   - Form inputs: Name, Relationship dropdown (`Self`, `Spouse`, `Child`, `Parent`, `Sibling`, `Other`), Date of Birth, Gender, Blood Group, Medical Conditions (comma-separated tags), Allergies (comma-separated tags).

### Task 4.3: Live Consultation Chat Integration
1. Update `src/app/App.tsx` and `src/features/ai-consultation/ChatView.tsx`:
   - Remove simulated `setTimeout` in `handleSendMessage`.
   - Call `consultationApi.sendMessage(activeFamilyMember.id, activeConsultationId, text)`.
   - Set loading state (`isTyping = true`) during API roundtrip.
   - Render live response, dynamic suggestion chips, and required medical disclaimer.
2. Build `CarePlanModal.tsx`:
   - Trigger button in chat header: "Generate AI Care Plan".
   - Calls `consultationApi.generateCarePlan(consultationId)` and renders structured sections (Summary, Possible Causes, Recommendations, Red Flags, Doctor Questions).

### Task 4.4: Report Upload & Right Health Panel Integration
1. Update `src/features/health-metrics/RightHealthPanel.tsx`:
   - Wire "Upload Report" button to launch file picker (accept `.pdf`, `.png`, `.jpg`).
   - Execution flow:
     1. Request S3 upload URL from `reportsApi.getUploadUrl(...)`.
     2. Upload file directly to S3 via `axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })`.
     3. Call `reportsApi.triggerAnalysis(recordId)` to trigger Nova Pro extraction.
     4. Refresh list of reports in UI.

---

## 4. Input & Output Specs and Validation Rules

### Frontend Validation Rules

1. **Auth Login Form:**
   - Email: Required, Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
   - Password: Required, min length 8 characters.

2. **Add Family Member Form:**
   - Name: Required, min 2 chars, max 100 chars.
   - Relationship: Required selection from enum.
   - Date of Birth: Required, must be a valid past date (`DOB <= today`).
   - Gender: Required selection.

3. **Report Upload Picker:**
   - File Extension: `.pdf`, `.png`, `.jpg`, `.jpeg`.
   - File Size: Maximum **10 MB** (Checked in JS before upload request).
   - If size > 10MB or invalid type, display immediate UI error toast: *"File must be a PDF or image under 10MB."*

4. **Chat Input Field:**
   - Text length: 1 to 2000 characters.
   - Input disabled while `isTyping === true` to prevent duplicate submissions.

---

## 5. Acceptance Criteria & Verification Steps

1. **Frontend Build & Lint Check:**
   ```bash
   npm run lint
   npm run build
   ```
   *Pass Criteria:* Clean build with zero TypeScript compilation or Oxlint errors.

2. **Full Auth & Family Profile UI Test:**
   - Open browser at `http://localhost:5173`.
   - Register a new user, log in, open Family Member modal, and create profile "Son (Aarav, 10 yrs)".
   *Pass Criteria:* Profile saved in DB and selectable in UI header dropdown.

3. **Live AI Chat & S3 Upload UI Test:**
   - Upload sample PDF report `CBC_Jan2026.pdf`.
   - Ask question: "Explain my CBC report results."
   *Pass Criteria:* File uploads to S3, health panel displays new document link, and live Bedrock AI reply displays CBC context analysis with medical disclaimer.
