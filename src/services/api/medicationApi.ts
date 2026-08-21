import { apiClient } from './client';
import type { Medication, MedicationCreate, MedicationUpdate } from '../../types';

export const medicationApi = {
  getMedications: async (familyMemberId: string, includeInactive: boolean = false): Promise<Medication[]> => {
    const { data } = await apiClient.get(`/medications/${familyMemberId}`, {
      params: { include_inactive: includeInactive }
    });
    return data;
  },

  createMedication: async (familyMemberId: string, medicationData: MedicationCreate): Promise<Medication> => {
    const { data } = await apiClient.post(`/medications/${familyMemberId}`, medicationData);
    return data;
  },

  updateMedication: async (medicationId: string, medicationData: MedicationUpdate): Promise<Medication> => {
    const { data } = await apiClient.put(`/medications/${medicationId}`, medicationData);
    return data;
  },

  deleteMedication: async (medicationId: string): Promise<void> => {
    await apiClient.delete(`/medications/${medicationId}`);
  }
};
