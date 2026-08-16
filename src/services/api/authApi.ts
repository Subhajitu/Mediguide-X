import { apiClient } from './client';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '../../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password || ''
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<{ message: string; user_id: string }> => {
    const response = await apiClient.post('/auth/register', {
      email: data.email,
      password: data.password,
      full_name: data.fullName
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return {
      id: response.data.id,
      email: response.data.email,
      fullName: response.data.full_name,
    };
  },

  updateUser: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put('/auth/me', {
      email: data.email,
      full_name: data.fullName
    });
    return {
      id: response.data.id,
      email: response.data.email,
      fullName: response.data.full_name,
    };
  },

  refresh: async (refreshToken: string): Promise<{ access_token: string; id_token: string; expires_in: number }> => {
    const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};
