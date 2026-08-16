/**
 * useDocumentUpload — shared document upload hook.
 *
 * Encapsulates the three-step upload flow:
 *   1. GET presigned upload URL from backend  → validates ownership + creates DB record
 *   2. PUT file bytes directly to S3 presigned URL
 *   3. POST to /analyze → triggers Nova Pro extraction
 *
 * Used by ChatInput (chat-attached document) and RightHealthPanel (report-only upload).
 *
 * Returns the uploaded record's s3_key on success so ChatInput can include it
 * in the subsequent chat message.
 */
import { useState } from 'react';
import axios from 'axios';
import { reportsApi } from '../services/api/reportsApi';
import type { ReportUploadUrlRequest } from '../types';

export interface UploadState {
  isUploading: boolean;
  error: string | null;
  /** s3_key of the most recently completed upload, null if none/cleared */
  pendingS3Key: string | null;
  /** Human-readable filename for display */
  pendingFileName: string | null;
  clearPending: () => void;
  upload: (file: File, familyMemberId: string) => Promise<string | null>;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ACCEPTED_EXTENSIONS = /\.(pdf|png|jpg|jpeg)$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function useDocumentUpload(): UploadState {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingS3Key, setPendingS3Key] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

  const clearPending = () => {
    setPendingS3Key(null);
    setPendingFileName(null);
    setError(null);
  };

  /**
   * Upload a file for the given family member.
   * Returns the s3_key on success, null on failure.
   * Sets error state on failure — never throws.
   */
  const upload = async (file: File, familyMemberId: string): Promise<string | null> => {
    setError(null);

    // Client-side validation (UX only — backend also validates)
    if (!ACCEPTED_TYPES.includes(file.type) || !ACCEPTED_EXTENSIONS.test(file.name)) {
      setError('Only PDF, PNG, JPG, and JPEG files are accepted.');
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 10 MB.');
      return null;
    }

    setIsUploading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const request: ReportUploadUrlRequest = {
        family_member_id: familyMemberId,
        title: file.name,
        filename: file.name,
        content_type: file.type,
        record_type: 'lab_report',
        record_date: today,
      };

      // Step 1: Get presigned URL + create DB record
      const urlData = await reportsApi.getUploadUrl(request);

      // Step 2: Upload bytes directly to S3
      await axios.put(urlData.upload_url, file, {
        headers: { 'Content-Type': file.type },
      });

      // Step 3: Trigger Nova Pro extraction (non-blocking for chat — fire and forget)
      // We don't await analysis here; the attachment is usable immediately.
      // The analysis runs in the background and updates the record when complete.
      reportsApi.triggerAnalysis(urlData.record_id).catch(() => {
        // Analysis failure is non-fatal — the document is still attached
      });

      setPendingS3Key(urlData.s3_key);
      setPendingFileName(file.name);
      return urlData.s3_key;
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } };
      setError(apiError?.response?.data?.detail || 'Upload failed. Please try again.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, error, pendingS3Key, pendingFileName, clearPending, upload };
}
