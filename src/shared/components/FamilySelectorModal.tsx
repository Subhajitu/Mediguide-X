import React, { useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import type { FamilyMember } from '../../types';
import './FamilySelectorModal.css';

interface FamilySelectorModalProps {
  onClose: () => void;
}

export const FamilySelectorModal: React.FC<FamilySelectorModalProps> = ({ onClose }) => {
  const { addFamilyMember } = usePatient();
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'self',
    date_of_birth: '',
    gender: 'male',
    blood_group: '',
    medical_conditions: '',
    allergies: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.name.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    const dob = new Date(formData.date_of_birth);
    if (dob > new Date()) {
      setError('Date of birth cannot be in the future.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Partial<FamilyMember> = {
        name: formData.name,
        relationship: formData.relationship,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        blood_group: formData.blood_group || undefined,
        medical_conditions: formData.medical_conditions
          ? formData.medical_conditions.split(',').map((s) => s.trim())
          : [],
        allergies: formData.allergies
          ? formData.allergies.split(',').map((s) => s.trim())
          : [],
      };
      await addFamilyMember(payload);
      onClose();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } };
      setError(apiError.response?.data?.detail || 'Failed to add family member.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="family-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="family-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-modal-title"
      >
        <div className="family-modal-header">
          <h2 id="family-modal-title" className="family-modal-title">
            Add Family Member
          </h2>
          <button
            className="family-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="family-modal-error" role="alert">
            {error}
          </p>
        )}

        <form className="family-modal-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="fm-name" className="sr-only">
            Full Name
          </label>
          <input
            id="fm-name"
            type="text"
            placeholder="Full Name"
            required
            className="family-modal-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <label htmlFor="fm-relationship" className="sr-only">
            Relationship
          </label>
          <select
            id="fm-relationship"
            className="family-modal-select"
            value={formData.relationship}
            onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
            required
          >
            <option value="self">Self</option>
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="sibling">Sibling</option>
            <option value="other">Other</option>
          </select>

          <label htmlFor="fm-dob" className="sr-only">
            Date of Birth
          </label>
          <input
            id="fm-dob"
            type="date"
            required
            className="family-modal-input"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />

          <label htmlFor="fm-gender" className="sr-only">
            Gender
          </label>
          <select
            id="fm-gender"
            className="family-modal-select"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <label htmlFor="fm-blood" className="sr-only">
            Blood Group
          </label>
          <input
            id="fm-blood"
            type="text"
            placeholder="Blood Group (e.g. O+)"
            className="family-modal-input"
            value={formData.blood_group}
            onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
          />

          <label htmlFor="fm-conditions" className="sr-only">
            Medical Conditions
          </label>
          <input
            id="fm-conditions"
            type="text"
            placeholder="Medical Conditions (comma separated)"
            className="family-modal-input"
            value={formData.medical_conditions}
            onChange={(e) =>
              setFormData({ ...formData, medical_conditions: e.target.value })
            }
          />

          <label htmlFor="fm-allergies" className="sr-only">
            Allergies
          </label>
          <input
            id="fm-allergies"
            type="text"
            placeholder="Allergies (comma separated)"
            className="family-modal-input"
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
          />

          <button
            type="submit"
            className="family-modal-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
