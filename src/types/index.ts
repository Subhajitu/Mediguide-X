export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData {
  email: string;
  password?: string;
  fullName: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface FamilyMember {
  id: string;
  user_id?: string;
  name: string;
  relationship: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  medical_conditions: string[];
  allergies: string[];
}

export interface ReportUploadUrlRequest {
  family_member_id: string;
  title: string;
  filename: string;
  content_type: string;
  record_type: 'lab_report' | 'prescription' | 'vitals_summary' | 'other';
  record_date: string; // YYYY-MM-DD
}

export interface ReportUploadUrlResponse {
  record_id: string;
  s3_key: string;
  upload_url: string;
  expires_in_seconds: number;
}

export interface MedicalRecordItem {
  id: string;
  title: string;
  record_type: string;
  record_date: string;
  summary?: string;
  download_url: string;
}

export interface ReportListResponse {
  records: MedicalRecordItem[];
}

export interface ChatMessageRequest {
  consultation_id?: string | null;
  message: string;
}

export interface ChatMessageResponse {
  consultation_id: string;
  user_message: string;
  ai_message: string;
  suggestions: string[];
  disclaimer: string;
  timestamp: string;
}

export interface CarePlanSchema {
  symptom_summary: string;
  possible_causes: string[];
  recommended_actions: string[];
  red_flags: string[];
  questions_for_doctor: string[];
  disclaimer: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestions?: string[];
  attachments?: { name: string; type: string; meta: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}
