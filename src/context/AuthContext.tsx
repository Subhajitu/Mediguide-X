import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { authApi } from '../services/api/authApi';
import type { User, LoginCredentials, RegisterData } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Defined early so it can be referenced by loadUser and the event listener
  const logout = () => {
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken'); // security rule: refresh_token lives in sessionStorage
    setUser(null);
    setIsAuthenticated(false);
    navigate('/', { replace: true });
  };

  const loadUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to load user:", error);
        logout();
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUser();

    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    localStorage.setItem('accessToken', response.access_token);
    // Store refresh token in sessionStorage — NEVER in localStorage (security rule)
    if (response.refresh_token) {
      sessionStorage.setItem('refreshToken', response.refresh_token);
    }
    await loadUser();
  };

  const register = async (data: RegisterData) => {
    await authApi.register(data);
    await login({ email: data.email, password: data.password });
  };

  const updateUser = async (data: Partial<User>) => {
    const updatedUser = await authApi.updateUser(data);
    setUser(updatedUser);
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const response = await authApi.refresh(refreshToken);
      localStorage.setItem('accessToken', response.access_token);
      return true;
    } catch {
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, updateUser, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
