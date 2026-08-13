import { apiClient } from './client';
import type { ChatMessageRequest, ChatMessageResponse, CarePlanSchema } from '../../types';

export const consultationApi = {
  sendMessage: async (familyMemberId: string, data: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await apiClient.post<ChatMessageResponse>(`/consultations/${familyMemberId}/messages`, data);
    return response.data;
  },

  generateCarePlan: async (consultationId: string): Promise<CarePlanSchema> => {
    const response = await apiClient.post<CarePlanSchema>(`/consultations/${consultationId}/care-plan`);
    return response.data;
  }
};
