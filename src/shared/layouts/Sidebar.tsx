import React from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { SidebarLogo } from '../ui/Logo';
import { type Conversation } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeId: string | null;
  onSelectConversation: (id: string | null) => void;
  conversations: Conversation[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, activeId, onSelectConversation, conversations }) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="flex items-center justify-between">
          {isOpen && <SidebarLogo />}
          <button className="sidebar-toggle-btn" onClick={onToggle}>
            <Icon name="menu" size={20} />
          </button>
        </div>
        
        {isOpen && (
          <Button variant="primary" fullWidth className="mt-6" onClick={() => onSelectConversation(null)}>
            <Icon name="plus" size={18} />
            New Consultation
          </Button>
        )}
      </div>

      {isOpen && (
        <>
          <div className="sidebar-content">
            <div className="history-section">
              <div className="section-header">
                <span className="section-title">Chat History</span>
                <button className="icon-btn"><Icon name="search" size={16} /></button>
              </div>
              
              <ul className="history-list">
                {conversations.map(item => (
                  <li 
                    key={item.id} 
                    className={`history-item ${activeId === item.id ? 'active' : ''}`}
                    onClick={() => onSelectConversation(item.id)}
                  >
                    <div className="history-item-icon">
                      <Icon name="chat" size={16} />
                    </div>
                    <div className="history-item-content">
                      <div className="history-item-title">{item.title}</div>
                      <div className="history-item-date">{item.date}</div>
                    </div>
                    {activeId === item.id && <Icon name="arrow-right" size={14} className="active-arrow" />}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="upload-zone">
              <Icon name="upload" size={24} className="text-accent mb-2" />
              <div className="upload-title">Upload Medical Reports</div>
              <div className="upload-subtitle">PDF, JPG, PNG up to 20MB</div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
