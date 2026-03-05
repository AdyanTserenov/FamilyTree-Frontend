import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const AUTH_BASE_URL = '/api/auth';
const TREE_BASE_URL = '/api';

export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const treeApi = axios.create({
  baseURL: TREE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Reads JWT from zustand in-memory store — always synchronous and up-to-date.
// Zustand persist hydrates synchronously on import, so no localStorage fallback needed.
const getToken = (): string | null => useAuthStore.getState().token;

// Add JWT token to requests
const addAuthInterceptor = (instance: typeof treeApi) => {
  instance.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const currentPath = window.location.pathname;
        // Don't redirect if already on auth/public pages — let the page handle the error itself
        const isPublicPage = currentPath === '/login' || currentPath === '/register'
          || currentPath === '/confirm-email' || currentPath === '/reset-password'
          || currentPath === '/forgot-password' || currentPath.startsWith('/invite/');
        // Don't logout on profile fetch failure — it's a background/non-critical request
        const requestUrl = error.config?.url || '';
        const isProfileRequest = requestUrl.includes('/profile');
        if (!isPublicPage && !isProfileRequest) {
          // Clear auth state via zustand store (also clears localStorage via persist)
          useAuthStore.getState().logout();
          const fullPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(fullPath)}`;
        }
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(authApi);
addAuthInterceptor(treeApi);
