import React, { useState, useEffect } from 'react';
import { usePatient } from '../../context/PatientContext';
import { medicationApi } from '../../services/api/medicationApi';
import type { Medication, MedicationCreate } from '../../types';
import { Button } from '../../shared/ui/Button';
import { Icon } from '../../shared/ui/Icon';
import './MedicationsView.css';

export const MedicationsView: React.FC = () => {
  const { activeFamilyMember } = usePatient();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newMed, setNewMed] = useState<MedicationCreate>({ name: '', dosage: '', frequency: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeFamilyMember) {
      loadMedications();
    } else {
      setMedications([]);
    }
  }, [activeFamilyMember]);

  const loadMedications = async () => {
    if (!activeFamilyMember) return;
    try {
      const data = await medicationApi.getMedications(activeFamilyMember.id, true);
      setMedications(data);
    } catch (err) {
      console.error("Failed to load medications", err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFamilyMember || !newMed.name || !newMed.dosage || !newMed.frequency) return;
    
    setLoading(true);
    try {
      await medicationApi.createMedication(activeFamilyMember.id, newMed);
      setIsAdding(false);
      setNewMed({ name: '', dosage: '', frequency: '' });
      await loadMedications();
    } catch (err) {
      console.error("Failed to add medication", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (med: Medication) => {
    try {
      await medicationApi.updateMedication(med.id, { is_active: !med.is_active });
      await loadMedications();
    } catch (err) {
      console.error("Failed to update medication", err);
    }
  };

  const handleDelete = async (medId: string) => {
    if (!window.confirm("Are you sure you want to delete this medication?")) return;
    try {
      await medicationApi.deleteMedication(medId);
      await loadMedications();
    } catch (err) {
      console.error("Failed to delete medication", err);
    }
  };

  if (!activeFamilyMember) {
    return (
      <div className="medications-view" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h3>No Family Member Selected</h3>
        <p>Please select a family member to manage medications.</p>
      </div>
    );
  }

  const activeMeds = medications.filter(m => m.is_active);
  const inactiveMeds = medications.filter(m => !m.is_active);

  return (
    <div className="medications-view">
      <div className="medications-header">
        <h2>Medications</h2>
        <p>Manage medications for {activeFamilyMember.name}</p>
      </div>

      <div className="medication-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Active Medications</h3>
          <Button onClick={() => setIsAdding(!isAdding)} variant="primary">
            <Icon name="plus" size={16} /> Add Medication
          </Button>
        </div>

        {isAdding && (
          <div className="add-medication-form">
            <h4>Add New Medication</h4>
            <form onSubmit={handleAdd}>
              <div className="form-grid" style={{ marginTop: '16px' }}>
                <div>
                  <input
                    placeholder="Medication Name (e.g. Aspirin)"
                    value={newMed.name}
                    onChange={e => setNewMed({...newMed, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <input
                    placeholder="Dosage (e.g. 100mg)"
                    value={newMed.dosage}
                    onChange={e => setNewMed({...newMed, dosage: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <input
                    placeholder="Frequency (e.g. Daily)"
                    value={newMed.frequency}
                    onChange={e => setNewMed({...newMed, frequency: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading}>Save</Button>
              </div>
            </form>
          </div>
        )}

        {activeMeds.length === 0 && !isAdding ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No active medications.</p>
        ) : (
          activeMeds.map(med => (
            <div key={med.id} className="medication-card">
              <div>
                <div className="medication-info"><h4>{med.name}</h4></div>
                <div className="medication-details">{med.dosage} • {med.frequency}</div>
              </div>
              <div className="medication-actions">
                <Button variant="outline" onClick={() => handleToggleActive(med)}>Mark Inactive</Button>
                <button type="button" className="icon-btn delete" onClick={() => handleDelete(med.id)} aria-label="Delete">
                  <Icon name="cross" size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {inactiveMeds.length > 0 && (
        <div className="medication-section">
          <h3>Inactive Medications</h3>
          {inactiveMeds.map(med => (
            <div key={med.id} className="medication-card" style={{ opacity: 0.7 }}>
              <div>
                <div className="medication-info"><h4>{med.name}</h4></div>
                <div className="medication-details">{med.dosage} • {med.frequency}</div>
              </div>
              <div className="medication-actions">
                <Button variant="outline" onClick={() => handleToggleActive(med)}>Mark Active</Button>
                <button type="button" className="icon-btn delete" onClick={() => handleDelete(med.id)} aria-label="Delete">
                  <Icon name="cross" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
