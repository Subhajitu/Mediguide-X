import React, { useEffect, useState } from 'react';
import { consultationApi } from '../../services/api/consultationApi';
import type { CarePlanSchema } from '../../types';

interface CarePlanModalProps {
  consultationId: string;
  onClose: () => void;
}

export const CarePlanModal: React.FC<CarePlanModalProps> = ({ consultationId, onClose }) => {
  const [carePlan, setCarePlan] = useState<CarePlanSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchCarePlan = async () => {
      // If it's a temp consultation ID (not saved), we shouldn't fetch
      if (consultationId.startsWith('temp')) {
        if (mounted) {
          setError('Please send a message to start the consultation before generating a care plan.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await consultationApi.generateCarePlan(consultationId);
        if (mounted) {
          setCarePlan(data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.detail || 'Failed to generate care plan.');
          setIsLoading(false);
        }
      }
    };
    fetchCarePlan();

    return () => { mounted = false; };
  }, [consultationId]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#1e3a8a' }}>AI Care Plan</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {isLoading ? (
          <div style={styles.loading}>
             <div className="spinner" style={{width: 30, height: 30, border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'}} />
             <p>Generating personalized care plan with Nova Pro...</p>
             <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <p style={{ color: 'red', margin: 0 }}>{error}</p>
          </div>
        ) : carePlan ? (
          <div style={styles.content}>
             <div style={styles.section}>
               <h4>Symptom Summary</h4>
               <p>{carePlan.symptom_summary}</p>
             </div>
             
             <div style={styles.section}>
               <h4>Possible Causes</h4>
               <ul>
                 {carePlan.possible_causes.map((item, i) => <li key={i}>{item}</li>)}
               </ul>
             </div>
             
             <div style={styles.section}>
               <h4>Recommended Actions</h4>
               <ul>
                 {carePlan.recommended_actions.map((item, i) => <li key={i}>{item}</li>)}
               </ul>
             </div>
             
             {carePlan.red_flags.length > 0 && (
               <div style={{...styles.section, backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
                 <h4 style={{color: '#dc2626'}}>🚨 Red Flags (Seek immediate care if you experience these)</h4>
                 <ul style={{color: '#991b1b'}}>
                   {carePlan.red_flags.map((item, i) => <li key={i}>{item}</li>)}
                 </ul>
               </div>
             )}
             
             <div style={styles.section}>
               <h4>Questions to ask your Doctor</h4>
               <ul>
                 {carePlan.questions_for_doctor.map((item, i) => <li key={i}>{item}</li>)}
               </ul>
             </div>
             
             <div style={styles.disclaimer}>
               <strong>Disclaimer:</strong> {carePlan.disclaimer}
             </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    backgroundColor: '#fff', padding: '30px', borderRadius: '12px',
    width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' as const,
    color: '#333', display: 'flex', flexDirection: 'column' as const
  },
  closeButton: {
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666'
  },
  loading: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '15px', padding: '40px 0', color: '#666'
  },
  errorContainer: {
    padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px'
  },
  content: {
    display: 'flex', flexDirection: 'column' as const, gap: '20px'
  },
  section: {
    backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0'
  },
  disclaimer: {
    fontSize: '12px', color: '#64748b', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', textAlign: 'center' as const
  }
};
