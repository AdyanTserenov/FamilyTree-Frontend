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

// Читает JWT напрямую из zustand store (in-memory, синхронно)
// Fallback на localStorage для случаев когда store ещё не инициализирован
const getToken = (): string | null => {
  // Primary: read from zustand in-memory store (always up-to-date)
  const storeToken = useAuthStore.getState().token;
  if (storeToken) return storeToken;
  // Fallback: read from localStorage (for page reloads before store hydrates)
  try {
    const raw = localStorage.getItem('jwt_token');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
};

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
        if (!isPublicPage) {
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
