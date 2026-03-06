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
        // Don't logout on background/polling requests — they are non-critical and
        // a 401 on them should not kick the user out (e.g. profile fetch, notification polling)
        const requestUrl = error.config?.url || '';
        // Only treat notification polling as non-critical background requests.
        // /profile is fetched on every page load by Layout — a 401 there means the
        // token is definitively expired and the user must be logged out.
        const isBackgroundRequest = requestUrl.includes('/notifications');
        if (!isPublicPage && !isBackgroundRequest) {
          // Clear auth state via zustand store (also clears localStorage via persist).
          // logout() sets isAuthenticated=false → PrivateRoute re-renders and does a
          // client-side <Navigate to="/login"> redirect. No window.location.href needed —
          // that would cause a full page reload and destroy React state.
          useAuthStore.getState().logout();
        }
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(authApi);
addAuthInterceptor(treeApi);
