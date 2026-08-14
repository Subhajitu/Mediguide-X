import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { SidebarLogo } from '../ui/SidebarLogo';
import { type Conversation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ComingSoonModal } from '../components/ComingSoonModal';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeId: string | null;
  onSelectConversation: (id: string | null) => void;
  conversations: Conversation[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  activeId, 
  onSelectConversation, 
  conversations,
  activeTab,
  onTabChange
}) => {
  const { isAuthenticated } = useAuth();
  const [showSettingsComingSoon, setShowSettingsComingSoon] = useState(false);
  
  // User Profile is completely removed. Settings only shown if logged in.
  const bottomMenuItems = isAuthenticated ? [
    { id: 'settings', icon: 'settings' as const, label: 'Settings' }
  ] : [];

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Animated Mesh Background */}
      <div className="sidebar-bg-mesh">
        <div className="sidebar-bg-blur-1"></div>
        <div className="sidebar-bg-blur-2"></div>
      </div>

      <div className="sidebar-header">
        <div className="flex items-center justify-between" style={{ height: '48px' }}>
          <SidebarLogo expanded={isOpen} animated={true} />
          {isOpen && (
            <button className="sidebar-toggle-btn" onClick={onToggle}>
              <Icon name="chevron-left" size={20} />
            </button>
          )}
          {!isOpen && (
             <button className="sidebar-toggle-btn mx-auto" onClick={onToggle}>
               <Icon name="chevron-right" size={20} />
             </button>
          )}
        </div>
      </div>

      <div className="sidebar-content">
        {/* Main action */}
        <button 
          className={`menu-item ${activeId === null ? 'active' : ''}`}
          onClick={() => onSelectConversation(null)}
        >
          {activeId === null && (
            <motion.div layoutId="active-indicator" className="active-indicator" />
          )}
          <div className="menu-item-icon">
            <Icon name="plus" size={20} />
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }} 
                animate={{ opacity: 1, width: 'auto' }} 
                exit={{ opacity: 0, width: 0 }}
                className="menu-item-text"
              >
                New Consultation
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <div style={{ margin: '16px 0 8px 12px', fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
          {isOpen ? 'Recent' : ''}
        </div>

        {conversations.map(item => (
          <button 
            key={item.id}
            className={`menu-item ${activeId === item.id ? 'active' : ''}`}
            onClick={() => onSelectConversation(item.id)}
          >
            {activeId === item.id && (
              <motion.div layoutId="active-indicator" className="active-indicator" />
            )}
            <div className="menu-item-icon">
              <Icon name="chat" size={18} />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }} 
                  animate={{ opacity: 1, width: 'auto' }} 
                  exit={{ opacity: 0, width: 0 }}
                  className="menu-item-text"
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {item.title}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        {bottomMenuItems.map(item => (
          <button 
            key={item.id} 
            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              if (item.id === 'settings') {
                setShowSettingsComingSoon(true);
              } else {
                onTabChange(item.id);
              }
            }}
          >
            <div className="menu-item-icon">
              <Icon name={item.icon} size={20} />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }} 
                  animate={{ opacity: 1, width: 'auto' }} 
                  exit={{ opacity: 0, width: 0 }}
                  className="menu-item-text"
                >
                  {item.label}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '11px', color: '#94A3B8', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
          {isOpen ? 'MediguideX v2.0.0' : ''}
        </div>
      </div>
    </aside>
    <ComingSoonModal 
      isOpen={showSettingsComingSoon} 
      onClose={() => setShowSettingsComingSoon(false)} 
      featureName="Settings Configuration" 
    />
    </>
  );
};
