import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';
import { Icon } from '../../shared/ui/Icon';
import { Button } from '../../shared/ui/Button';
import type { FamilyMember } from '../../types';
import './UserProfileView.css';

export const UserProfileView: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { familyMembers, addFamilyMember, updateFamilyMember, deleteFamilyMember } = usePatient();

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userName, setUserName] = useState(user?.fullName || '');
  
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [addingFamily, setAddingFamily] = useState(false);
  
  const [familyForm, setFamilyForm] = useState<Partial<FamilyMember>>({});
  const [medicalConditionsStr, setMedicalConditionsStr] = useState('');
  const [allergiesStr, setAllergiesStr] = useState('');

  const handleSaveUser = async () => {
    await updateUser({ fullName: userName, email: user?.email });
    setIsEditingUser(false);
  };

  const resetFamilyForm = () => {
    setFamilyForm({ name: '', relationship: '', gender: '', date_of_birth: '', blood_group: '' });
    setMedicalConditionsStr('');
    setAllergiesStr('');
  };

  const handleStartAddFamily = () => {
    resetFamilyForm();
    setAddingFamily(true);
    setEditingFamilyId(null);
  };

  const handleStartEditFamily = (member: FamilyMember) => {
    setFamilyForm(member);
    setEditingFamilyId(member.id);
    setAddingFamily(false);
    setMedicalConditionsStr(member.medical_conditions?.join(', ') || '');
    setAllergiesStr(member.allergies?.join(', ') || '');
  };

  const handleSaveFamily = async () => {
    const payload: Partial<FamilyMember> = {
      ...familyForm,
      blood_group: familyForm.blood_group || undefined,
      medical_conditions: medicalConditionsStr ? medicalConditionsStr.split(',').map(s => s.trim()) : [],
      allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [],
    };

    if (editingFamilyId) {
      await updateFamilyMember(editingFamilyId, payload);
      setEditingFamilyId(null);
    } else if (addingFamily) {
      await addFamilyMember(payload);
      setAddingFamily(false);
    }
  };

  return (
    <div className="user-profile-view">
      <div className="profile-header">
        <h2>User Profile & Settings</h2>
        <p>Manage your personal information and family members.</p>
      </div>

      <div className="profile-section">
        <div className="section-header">
          <h3>Personal Details</h3>
          {!isEditingUser && (
            <Button variant="outline" size="sm" onClick={() => setIsEditingUser(true)}>
              Edit Profile
            </Button>
          )}
        </div>
        
        <div className="profile-card">
          {isEditingUser ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email (Read-only)</label>
                <input type="text" value={user?.email} disabled />
              </div>
              <div className="form-actions">
                <Button variant="outline" onClick={() => setIsEditingUser(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveUser}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value">{user?.fullName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{user?.email}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="profile-section mt-8">
        <div className="section-header">
          <h3>Family Members</h3>
          {!addingFamily && (
            <Button variant="primary" size="sm" onClick={handleStartAddFamily}>
              + Add Family
            </Button>
          )}
        </div>

        {(addingFamily || editingFamilyId) && (
          <div className="profile-card edit-form highlight-form mb-6">
            <h4 className="mb-4">{addingFamily ? 'Add New Family Member' : 'Edit Family Member'}</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={familyForm.name || ''} onChange={(e) => setFamilyForm({...familyForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <select value={familyForm.relationship || ''} onChange={(e) => setFamilyForm({...familyForm, relationship: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="Self">Self</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                </select>
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={familyForm.gender || ''} onChange={(e) => setFamilyForm({...familyForm, gender: e.target.value})}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={familyForm.date_of_birth || ''} onChange={(e) => setFamilyForm({...familyForm, date_of_birth: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <input type="text" placeholder="e.g. O+" value={familyForm.blood_group || ''} onChange={(e) => setFamilyForm({...familyForm, blood_group: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Medical Conditions</label>
                <input type="text" placeholder="Comma separated" value={medicalConditionsStr} onChange={(e) => setMedicalConditionsStr(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Allergies</label>
                <input type="text" placeholder="Comma separated" value={allergiesStr} onChange={(e) => setAllergiesStr(e.target.value)} />
              </div>
            </div>
            <div className="form-actions mt-4">
              <Button variant="outline" onClick={() => { setAddingFamily(false); setEditingFamilyId(null); }}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveFamily}>Save Family Member</Button>
            </div>
          </div>
        )}

        <div className="family-grid">
          {familyMembers.map((member) => (
            <div key={member.id} className="family-card">
              <div className="family-card-header">
                <div className="family-info">
                  <h4>{member.name}</h4>
                  <span className="badge-relationship">{member.relationship}</span>
                </div>
                <div className="family-actions">
                  <button className="icon-btn edit" onClick={() => handleStartEditFamily(member)} title="Edit">
                    <Icon name="attach" size={16} /> {/* Placeholder for edit icon */}
                  </button>
                  <button className="icon-btn delete" onClick={() => deleteFamilyMember(member.id)} title="Delete">
                    <Icon name="cross" size={16} />
                  </button>
                </div>
              </div>
              <div className="family-details-mini">
                <p>Gender: {member.gender}</p>
                <p>DOB: {member.date_of_birth}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="profile-section mt-12">
        <div className="danger-zone">
          <div className="danger-text">
            <h4>Sign Out</h4>
            <p>Log out of your MediguideX account on this device.</p>
          </div>
          <Button variant="outline" onClick={logout}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
};
