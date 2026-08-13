import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

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
    } catch (err: any) {
      let errorMessage = 'Authentication failed. Please check credentials.';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d.msg || 'Invalid input').join(', ');
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              style={styles.input}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            required
            minLength={8}
          />
          <button type="submit" style={styles.button} disabled={isLoading}>
            {isLoading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>
        <button type="button" onClick={() => setIsLogin(!isLogin)} style={styles.linkButton}>
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    backgroundColor: '#fff', padding: '30px', borderRadius: '12px',
    width: '400px', maxWidth: '90%', color: '#000', display: 'flex', flexDirection: 'column' as const, gap: '15px'
  },
  form: {
    display: 'flex', flexDirection: 'column' as const, gap: '10px'
  },
  input: {
    padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px'
  },
  button: {
    padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer'
  },
  linkButton: {
    background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginTop: '10px'
  },
  error: {
    color: 'red', fontSize: '14px', margin: 0
  }
};
