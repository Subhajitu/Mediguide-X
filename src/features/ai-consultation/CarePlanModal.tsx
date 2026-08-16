import React, { useEffect, useState } from 'react';
import { consultationApi } from '../../services/api/consultationApi';
import type { CarePlanSchema } from '../../types';
import './CarePlanModal.css';

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
      } catch (err: unknown) {
        if (mounted) {
          const apiError = err as { response?: { data?: { detail?: string } } };
          setError(apiError.response?.data?.detail || 'Failed to generate care plan.');
          setIsLoading(false);
        }
      }
    };

    fetchCarePlan();
    return () => { mounted = false; };
  }, [consultationId]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="careplan-overlay" onClick={handleOverlayClick}>
      <div
        className="careplan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="careplan-title"
      >
        <div className="careplan-header">
          <h2 id="careplan-title" className="careplan-title">AI Care Plan</h2>
          <button
            className="careplan-close"
            onClick={onClose}
            aria-label="Close care plan"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="careplan-loading" aria-live="polite">
            <div className="careplan-spinner" aria-hidden="true" />
            <p>Generating personalized care plan with Nova Pro...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="careplan-error" role="alert">{error}</div>
        )}

        {!isLoading && !error && carePlan && (
          <div className="careplan-content">
            <div className="careplan-section">
              <h4>Symptom Summary</h4>
              <p>{carePlan.symptom_summary}</p>
            </div>

            <div className="careplan-section">
              <h4>Possible Causes</h4>
              <ul>
                {carePlan.possible_causes.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="careplan-section">
              <h4>Recommended Actions</h4>
              <ul>
                {carePlan.recommended_actions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {carePlan.red_flags.length > 0 && (
              <div className="careplan-section careplan-section--red-flags">
                <h4>🚨 Red Flags — Seek immediate care if you experience these</h4>
                <ul>
                  {carePlan.red_flags.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="careplan-section">
              <h4>Questions to ask your Doctor</h4>
              <ul>
                {carePlan.questions_for_doctor.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="careplan-disclaimer">
              <strong>Disclaimer:</strong> {carePlan.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
