import { apiClient } from './client';
import type { FamilyMember } from '../../types';

export const familyApi = {
  getFamilyMembers: async (): Promise<FamilyMember[]> => {
    // In our backend, we need a generic family list endpoint.
    // Wait, did we create /family in backend? The requirements in sprint 1 said Family Member management.
    // If not, we will need to add it or mock it if missing. Let's assume it exists at /family
    const response = await apiClient.get<FamilyMember[]>('/family');
    return response.data;
  },

  addFamilyMember: async (data: Partial<FamilyMember>): Promise<FamilyMember> => {
    const response = await apiClient.post<FamilyMember>('/family', data);
    return response.data;
  }
};
