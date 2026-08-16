import React, { useState, useEffect } from 'react';
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
  onTabChange,
}) => {
  const { isAuthenticated } = useAuth();
  const [showSettingsComingSoon, setShowSettingsComingSoon] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On mobile, close the drawer after navigation so the content is visible
  const handleSelectConversation = (id: string | null) => {
    if (isMobile && isOpen) onToggle();
    onSelectConversation(id);
  };

  const handleTabChange = (tabId: string) => {
    if (isMobile && isOpen) onToggle();
    onTabChange(tabId);
  };

  const bottomMenuItems = isAuthenticated
    ? [{ id: 'settings', icon: 'settings' as const, label: 'Settings' }]
    : [];

  return (
    <>
      {/* Mobile backdrop — renders behind the sidebar, closes drawer on tap */}
      {isMobile && isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : ''}`}
        aria-label="Navigation sidebar"
      >
        {/* Animated Mesh Background */}
        <div className="sidebar-bg-mesh">
          <div className="sidebar-bg-blur-1" />
          <div className="sidebar-bg-blur-2" />
        </div>

        <div className="sidebar-header">
          <div className="flex items-center justify-between sidebar-header-inner">
            <SidebarLogo expanded={isOpen} animated={true} />
            {isOpen && (
              <button
                className="sidebar-toggle-btn"
                onClick={onToggle}
                aria-label="Close sidebar"
              >
                <Icon name="chevron-left" size={20} />
              </button>
            )}
            {!isOpen && (
              <button
                className="sidebar-toggle-btn mx-auto"
                onClick={onToggle}
                aria-label="Open sidebar"
              >
                <Icon name="chevron-right" size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-content">
          <button
            className={`menu-item ${activeId === null ? 'active' : ''}`}
            onClick={() => handleSelectConversation(null)}
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

          <div className={`sidebar-section-label ${isOpen ? 'visible' : 'hidden'}`}>
            {isOpen ? 'Recent' : ''}
          </div>

          {conversations.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeId === item.id ? 'active' : ''}`}
              onClick={() => handleSelectConversation(item.id)}
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
                    className="menu-item-text menu-item-text--truncate"
                  >
                    {item.title}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          {bottomMenuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'settings') {
                  setShowSettingsComingSoon(true);
                } else {
                  handleTabChange(item.id);
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
          <div className={`sidebar-version ${isOpen ? 'visible' : 'hidden'}`}>
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
