import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import avatar from '../../assets/avatar.jpg';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';
import { ComingSoonModal } from '../components/ComingSoonModal';
import './TopNav.css';

const allNavLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: 'menu' },
  { id: 'reports', label: 'Medical Reports', icon: 'report' },
  { id: 'appointments', label: 'Appointments', icon: 'calendar' },
  { id: 'medication', label: 'Medication', icon: 'pill' },
  { id: 'scans', label: 'Scan & Labs', icon: 'microscope' },
  { id: 'timeline', label: 'Health Timeline', icon: 'heart-rate' },
];

const comingSoonTabs = ['appointments', 'medication', 'scans', 'timeline'];

interface TopNavProps {
  onAddFamily?: () => void;
  onLoginClick?: () => void;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onMenuClick?: () => void; // opens mobile sidebar drawer
}

export const TopNav: React.FC<TopNavProps> = ({ onAddFamily, onLoginClick, activeTab, onTabChange, onMenuClick }) => {
  const { user, isAuthenticated } = useAuth();
  const { familyMembers, activeFamilyMember, selectFamilyMember } = usePatient();
  const [comingSoonFeature, setComingSoonFeature] = useState<string | null>(null);

  // Filter links: if not authenticated, only show Dashboard.
  const visibleLinks = isAuthenticated 
    ? allNavLinks 
    : allNavLinks.filter(link => link.id === 'dashboard');

  return (
    <>
      <header className="topnav">
        {/* Hamburger — visible only on mobile (≤720px), opens the sidebar drawer */}
        <button
          className="topnav-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Icon name="menu" size={22} />
        </button>

        <nav className="topnav-nav">
          {visibleLinks.map(link => (
            <button
              key={link.id}
              type="button"
              className={`nav-link ${activeTab === link.id ? 'active' : ''}`}
              onClick={() => {
                if (comingSoonTabs.includes(link.id)) {
                  setComingSoonFeature(link.label);
                } else {
                  onTabChange(link.id);
                }
              }}
            >
              <Icon name={link.icon as any} size={18} className="nav-icon" />
              <span className="nav-label">{link.label}</span>
            </button>
          ))}
        </nav>

        <div className="topnav-actions" style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          {isAuthenticated && (
            <div className="family-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

          <button className="notification-btn" aria-label="Notifications">
            <Icon name="bell" size={20} />
          </button>

          {isAuthenticated ? (
            <div className="user-profile" onClick={() => onTabChange('profile')} style={{cursor: 'pointer'}} title="Click to view profile">
              <img src={avatar} alt="User Avatar" className="avatar" />
              <div className="user-info">
                <span className="user-name">Hi, {user?.fullName || 'User'}</span>
                <span className="user-view-profile">View Profile</span>
              </div>
            </div>
          ) : (
            <button onClick={onLoginClick} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
              Login / Register
            </button>
          )}
        </div>
      </header>
      
      <ComingSoonModal 
        isOpen={!!comingSoonFeature} 
        onClose={() => setComingSoonFeature(null)} 
        featureName={comingSoonFeature || ''} 
      />
    </>
  );
};
