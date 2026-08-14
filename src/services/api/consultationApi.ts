import { apiClient } from './client';
import type { ChatMessageRequest, ChatMessageResponse, CarePlanSchema, Conversation } from '../../types';

export const consultationApi = {
  getConsultations: async (familyMemberId: string): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>(`/consultations/${familyMemberId}`);
    return response.data;
  },

  sendMessage: async (familyMemberId: string, data: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await apiClient.post<ChatMessageResponse>(`/consultations/${familyMemberId}/messages`, data);
    return response.data;
  },

  generateCarePlan: async (consultationId: string): Promise<CarePlanSchema> => {
    const response = await apiClient.post<CarePlanSchema>(`/consultations/${consultationId}/care-plan`);
    return response.data;
  }
};
