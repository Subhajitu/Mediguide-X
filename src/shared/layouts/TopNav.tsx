import React from 'react';
import { Icon } from '../ui/Icon';
import avatar from '../../assets/avatar.jpg';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';
import './TopNav.css';

const navLinks = [
  { label: 'Dashboard', icon: 'menu', active: true },
  { label: 'Medical Reports', icon: 'report' },
  { label: 'Appointments', icon: 'calendar' },
  { label: 'Medication', icon: 'pill' },
  { label: 'Scan & Labs', icon: 'microscope' },
  { label: 'Health Timeline', icon: 'heart-rate' },
];

interface TopNavProps {
  onAddFamily?: () => void;
  onLoginClick?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onAddFamily, onLoginClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { familyMembers, activeFamilyMember, selectFamilyMember } = usePatient();

  return (
    <header className="topnav">
      <nav className="topnav-nav">
        {navLinks.map(link => (
          <a key={link.label} href="#" className={`nav-link ${link.active ? 'active' : ''}`}>
            <Icon name={link.icon as any} size={18} className="nav-icon" />
            <span className="nav-label">{link.label}</span>
          </a>
        ))}
      </nav>

      <div className="topnav-actions" style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
        {isAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <select 
               value={activeFamilyMember?.id || ''} 
               onChange={(e) => selectFamilyMember(e.target.value)}
               style={{ padding: '5px', borderRadius: '4px' }}
             >
               {familyMembers.map(m => (
                 <option key={m.id} value={m.id}>{m.name} ({m.relationship})</option>
               ))}
             </select>
             <button onClick={onAddFamily} style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }}>
               + Family Member
             </button>
          </div>
        )}

        <button className="notification-btn">
          <Icon name="bell" size={20} />
          <span className="badge">3</span>
        </button>

        {isAuthenticated ? (
          <div className="user-profile" onClick={logout} style={{cursor: 'pointer'}} title="Click to logout">
            <img src={avatar} alt="User Avatar" className="avatar" />
            <div className="user-info">
              <span className="user-name">Hi, {user?.fullName || 'User'}</span>
              <span className="user-view-profile">Logout</span>
            </div>
          </div>
        ) : (
          <button onClick={onLoginClick} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
            Login / Register
          </button>
        )}
      </div>
    </header>
  );
};
