import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MedicationsView } from '../features/medications/MedicationsView';
import { usePatient } from '../context/PatientContext';
import { medicationApi } from '../services/api/medicationApi';
import '@testing-library/jest-dom';

vi.mock('../context/PatientContext', () => ({
  usePatient: vi.fn(),
}));

vi.mock('../services/api/medicationApi', () => ({
  medicationApi: {
    getMedications: vi.fn(),
    createMedication: vi.fn(),
    updateMedication: vi.fn(),
    deleteMedication: vi.fn(),
  },
}));

describe('MedicationsView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders "No Family Member Selected" when no active member', () => {
    vi.mocked(usePatient).mockReturnValue({
      activeFamilyMember: null,
      familyMembers: [],
      addFamilyMember: vi.fn(),
      updateFamilyMember: vi.fn(),
      deleteFamilyMember: vi.fn(),
      activeConsultationId: null,
      setConsultationId: vi.fn(),
      reports: [],
      refreshReports: vi.fn(),
      selectFamilyMember: vi.fn(),
      isLoading: false,
      addReport: vi.fn(),
    });

    render(<MedicationsView />);
    expect(screen.getByText('No Family Member Selected')).toBeInTheDocument();
  });

  it('renders medication list from mocked API', async () => {
    vi.mocked(usePatient).mockReturnValue({
      activeFamilyMember: { id: 'fam-123', name: 'John Doe', relationship: 'Self', date_of_birth: '1990-01-01', gender: 'Male', medical_conditions: [], allergies: [] },
      familyMembers: [],
      addFamilyMember: vi.fn(),
      updateFamilyMember: vi.fn(),
      deleteFamilyMember: vi.fn(),
      activeConsultationId: null,
      setConsultationId: vi.fn(),
      reports: [],
      refreshReports: vi.fn(),
      selectFamilyMember: vi.fn(),
      isLoading: false,
      addReport: vi.fn(),
    });

    vi.mocked(medicationApi.getMedications).mockResolvedValue([
      { id: '1', family_member_id: 'fam-123', name: 'Aspirin', dosage: '100mg', frequency: 'Daily', is_active: true },
      { id: '2', family_member_id: 'fam-123', name: 'Tylenol', dosage: '500mg', frequency: 'As needed', is_active: false },
    ]);

    render(<MedicationsView />);
    
    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument();
      expect(screen.getByText('100mg • Daily')).toBeInTheDocument();
      expect(screen.getByText('Tylenol')).toBeInTheDocument();
      expect(screen.getByText('500mg • As needed')).toBeInTheDocument();
    });
  });
});
