import React, { useState } from 'react';
import { usePatient } from '../../context/PatientContext';
import type { FamilyMember } from '../../types';

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
    allergies: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
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
        medical_conditions: formData.medical_conditions ? formData.medical_conditions.split(',').map(s => s.trim()) : [],
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : [],
      };
      await addFamilyMember(payload);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add family member.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Add Family Member</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text" placeholder="Name" required
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            style={styles.input}
          />
          <select 
            value={formData.relationship} onChange={e => setFormData({...formData, relationship: e.target.value})}
            style={styles.input} required
          >
            <option value="self">Self</option>
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="sibling">Sibling</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date" required
            value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})}
            style={styles.input}
          />
          <select 
            value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
            style={styles.input} required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input
            type="text" placeholder="Blood Group (e.g. O+)"
            value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})}
            style={styles.input}
          />
          <input
            type="text" placeholder="Medical Conditions (comma separated)"
            value={formData.medical_conditions} onChange={e => setFormData({...formData, medical_conditions: e.target.value})}
            style={styles.input}
          />
          <input
            type="text" placeholder="Allergies (comma separated)"
            value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})}
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
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
    width: '500px', maxWidth: '90%', color: '#000', display: 'flex', flexDirection: 'column' as const, gap: '15px'
  },
  form: {
    display: 'flex', flexDirection: 'column' as const, gap: '10px'
  },
  input: {
    padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px'
  },
  button: {
    padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer'
  },
  closeButton: {
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer'
  },
  error: {
    color: 'red', fontSize: '14px', margin: 0
  }
};
