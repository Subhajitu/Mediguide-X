import { apiClient } from './client';
import type { ReportUploadUrlRequest, ReportUploadUrlResponse, ReportListResponse, MedicalRecordItem } from '../../types';

export const reportsApi = {
  getReports: async (familyMemberId: string): Promise<ReportListResponse> => {
    const response = await apiClient.get<ReportListResponse>(`/reports/${familyMemberId}`);
    return response.data;
  },

  getUploadUrl: async (data: ReportUploadUrlRequest): Promise<ReportUploadUrlResponse> => {
    const response = await apiClient.post<ReportUploadUrlResponse>('/reports/upload-url', data);
    return response.data;
  },

  triggerAnalysis: async (recordId: string): Promise<MedicalRecordItem> => {
    const response = await apiClient.post<MedicalRecordItem>(`/reports/${recordId}/analyze`);
    return response.data;
  }
};
