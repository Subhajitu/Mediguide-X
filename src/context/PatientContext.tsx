import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { familyApi } from '../services/api/familyApi';
import { reportsApi } from '../services/api/reportsApi';
import type { FamilyMember, MedicalRecordItem } from '../types';
import { useAuth } from './AuthContext';

interface PatientContextType {
  familyMembers: FamilyMember[];
  activeFamilyMember: FamilyMember | null;
  activeConsultationId: string | null;
  reports: MedicalRecordItem[];
  isLoading: boolean;
  selectFamilyMember: (id: string) => void;
  addFamilyMember: (data: Partial<FamilyMember>) => Promise<void>;
  updateFamilyMember: (id: string, data: Partial<FamilyMember>) => Promise<void>;
  deleteFamilyMember: (id: string) => Promise<void>;
  refreshReports: () => Promise<void>;
  addReport: (report: MedicalRecordItem) => void;
  setConsultationId: (id: string | null) => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const PatientProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activeFamilyMember, setActiveFamilyMember] = useState<FamilyMember | null>(null);
  const [activeConsultationId, setConsultationId] = useState<string | null>(null);
  const [reports, setReports] = useState<MedicalRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadFamilyMembers();
    } else {
      setFamilyMembers([]);
      setActiveFamilyMember(null);
      setReports([]);
      setConsultationId(null);
    }
  }, [isAuthenticated]);

  const loadFamilyMembers = async () => {
    setIsLoading(true);
    try {
      const members = await familyApi.getFamilyMembers();
      setFamilyMembers(members);
      if (members.length > 0 && !activeFamilyMember) {
        setActiveFamilyMember(members[0]);
      }
    } catch (error) {
      console.error("Failed to load family members:", error);
    }
    setIsLoading(false);
  };

  const selectFamilyMember = (id: string) => {
    const member = familyMembers.find(m => m.id === id);
    if (member) {
      setActiveFamilyMember(member);
      setConsultationId(null); // Reset chat when switching member
    }
  };

  const addFamilyMember = async (data: Partial<FamilyMember>) => {
    const newMember = await familyApi.addFamilyMember(data);
    setFamilyMembers(prev => [...prev, newMember]);
    setActiveFamilyMember(newMember);
  };

  const updateFamilyMember = async (id: string, data: Partial<FamilyMember>) => {
    const updatedMember = await familyApi.updateFamilyMember(id, data);
    setFamilyMembers(prev => prev.map(m => m.id === id ? updatedMember : m));
    if (activeFamilyMember?.id === id) {
      setActiveFamilyMember(updatedMember);
    }
  };

  const deleteFamilyMember = async (id: string) => {
    await familyApi.deleteFamilyMember(id);
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
    if (activeFamilyMember?.id === id) {
      setActiveFamilyMember(null);
      setReports([]);
      setConsultationId(null);
    }
  };

  const refreshReports = async () => {
    if (!activeFamilyMember) return;
    try {
      const response = await reportsApi.getReports(activeFamilyMember.id);
      setReports(response.records);
    } catch (error) {
      console.error("Failed to fetch reports", error);
    }
  };

  const addReport = (report: MedicalRecordItem) => {
    setReports(prev => [report, ...prev]);
  };

  // Whenever active member changes, fetch reports
  useEffect(() => {
    if (activeFamilyMember) {
      refreshReports();
    }
  }, [activeFamilyMember]);

  return (
    <PatientContext.Provider value={{
      familyMembers,
      activeFamilyMember,
      activeConsultationId,
      reports,
      isLoading,
      selectFamilyMember,
      addFamilyMember,
      updateFamilyMember,
      deleteFamilyMember,
      refreshReports,
      addReport,
      setConsultationId
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};
