import React from 'react';
import { Icon } from '../ui/Icon';
import avatar from '../../assets/avatar.jpg';
import './TopNav.css';

const navLinks = [
  { label: 'Dashboard', icon: 'menu', active: true },
  { label: 'Medical Reports', icon: 'report' },
  { label: 'Appointments', icon: 'calendar' },
  { label: 'Medication', icon: 'pill' },
  { label: 'Scan & Labs', icon: 'microscope' },
  { label: 'Health Timeline', icon: 'heart-rate' },
];

export const TopNav: React.FC = () => {
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

      <div className="topnav-actions">
        <button className="notification-btn">
          <Icon name="bell" size={20} />
          <span className="badge">3</span>
        </button>

        <div className="user-profile">
          <img src={avatar} alt="User Avatar" className="avatar" />
          <div className="user-info">
            <span className="user-name">Hi, Subhajit</span>
            <span className="user-view-profile">View Profile</span>
          </div>
          <Icon name="chevron-down" size={16} className="text-muted" />
        </div>
      </div>
    </header>
  );
};
