import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../ui/Icon';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ isOpen, onClose, featureName = 'This feature' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
            zIndex: 9999
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative background glow */}
            <div style={{
              position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)',
              width: '100px', height: '100px', background: '#3b82f6', filter: 'blur(60px)', opacity: 0.5
            }} />

            <div style={{ 
              width: '64px', height: '64px', margin: '0 auto 24px', 
              background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <Icon name="calendar" size={32} className="text-blue" style={{ color: '#3b82f6' }} />
            </div>
            
            <h2 style={{ 
              margin: '0 0 12px 0', fontSize: '24px', fontWeight: 600, color: '#f8fafc',
              fontFamily: '"SF Pro Display", -apple-system, sans-serif', letterSpacing: '-0.5px'
            }}>
              Coming Soon
            </h2>
            
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '15px', lineHeight: 1.6 }}>
              We're working hard to bring you <strong style={{color: '#e2e8f0'}}>{featureName}</strong>. 
              Stay tuned for our next exciting update!
            </p>
            
            <button 
              onClick={onClose}
              style={{
                marginTop: '32px', width: '100%', padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
