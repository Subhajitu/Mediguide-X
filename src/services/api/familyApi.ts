import { apiClient } from './client';
import type { FamilyMember } from '../../types';

export const familyApi = {
  getFamilyMembers: async (): Promise<FamilyMember[]> => {
    const response = await apiClient.get<FamilyMember[]>('/family');
    return response.data;
  },

  addFamilyMember: async (data: Partial<FamilyMember>): Promise<FamilyMember> => {
    const response = await apiClient.post<FamilyMember>('/family', data);
    return response.data;
  },

  updateFamilyMember: async (id: string, data: Partial<FamilyMember>): Promise<FamilyMember> => {
    const response = await apiClient.put<FamilyMember>(`/family/${id}`, data);
    return response.data;
  },

  deleteFamilyMember: async (id: string): Promise<void> => {
    await apiClient.delete(`/family/${id}`);
  }
};
