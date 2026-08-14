import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { HeroLogo } from '../ui/Logo';
import { Icon } from '../ui/Icon';
import './AuthModal.css';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input on mount
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!isLogin && fullName.length < 2) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ email, password, fullName });
      }
      onClose();
    } catch (err: unknown) {
      let errorMessage = 'Authentication failed. Please check credentials.';
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => d.msg || 'Invalid input').join(', ');
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="auth-overlay"
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.3 }}
        onClick={handleOverlayClick}
      >
        <div className="auth-modal-wrapper" ref={modalRef} role="dialog" aria-modal="true">
          <div className="auth-modal-glow"></div>
          
          <motion.div
            className="auth-modal"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
              <Icon name="cross" size={16} />
            </button>

            <div className="auth-header">
              <div className="auth-logo-container">
                <HeroLogo className="animate-pulse-glow" style={{ fontSize: '24px' }} />
              </div>
              <h2 className="auth-title">Welcome to MediguideX</h2>
              <p className="auth-subtitle">Your premium AI healthcare companion</p>
            </div>

            <div className="auth-tabs">
              <motion.div
                className="auth-tab-active-bg"
                layout
                initial={false}
                animate={{
                  left: isLogin ? '4px' : 'calc(50% + 2px)',
                  right: isLogin ? 'calc(50% + 2px)' : '4px',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              <div 
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(true); setError(''); }}
              >
                Log In
              </div>
              <div 
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => { setIsLogin(false); setError(''); }}
              >
                Register
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: isLogin ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 10 : -10 }}
                transition={{ duration: 0.2 }}
              >
                {error && <div className="auth-error">{error}</div>}
                
                <form onSubmit={handleSubmit} className="auth-form">
                  {!isLogin && (
                    <div className="auth-input-group">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="auth-input"
                        required
                        ref={firstInputRef}
                      />
                    </div>
                  )}
                  
                  <div className="auth-input-group">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="auth-input"
                      required
                      ref={isLogin ? firstInputRef : null}
                    />
                  </div>
                  
                  <div className="auth-input-group">
                    <input
                      type="password"
                      placeholder="Password (min 8 chars)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="auth-input"
                      required
                      minLength={8}
                    />
                  </div>
                  
                  <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                    {isLoading ? 'Processing...' : isLogin ? 'Log In' : 'Create Account'}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>

            <div className="auth-divider">or continue with</div>

            <button type="button" className="auth-google-btn" onClick={(e) => { e.preventDefault(); }}>
              <svg className="auth-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
