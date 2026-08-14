import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoIcon } from './LogoIcon';
import './logo.css';

interface SidebarLogoProps {
  expanded: boolean;
  animated?: boolean;
}

export const SidebarLogo: React.FC<SidebarLogoProps> = ({ expanded, animated = true }) => {
  return (
    <div className="logo-wrapper" style={{ justifyContent: expanded ? 'flex-start' : 'center' }}>
      <LogoIcon size={36} animated={animated} />
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}
          >
            <span className="logo-text" style={{ fontSize: '20px' }}>
              Mediguide<span className="logo-text-x">X</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
