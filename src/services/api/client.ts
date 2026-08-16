import axios from 'axios';

// Ensure the trailing slash isn't doubled, default to 8000 for backend
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track whether a refresh is in progress to prevent multiple concurrent refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and only once per request (_retry flag)
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = sessionStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token available — dispatch logout event and reject
        window.dispatchEvent(new Event('auth-unauthorized'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is already in progress — queue this request
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint directly with a plain axios instance to avoid
        // interceptor re-entry (circular dependency with apiClient)
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccessToken: string = refreshResponse.data.access_token;
        localStorage.setItem('accessToken', newAccessToken);

        // Notify all queued requests with the new token
        onRefreshed(newAccessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear all tokens and force logout
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        refreshSubscribers = [];
        window.dispatchEvent(new Event('auth-unauthorized'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
