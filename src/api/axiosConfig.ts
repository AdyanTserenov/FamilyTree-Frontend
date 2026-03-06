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

// Public auth endpoints that must NOT receive an Authorization header.
// Sending an expired token to these endpoints causes the backend to reject
// the request with 401 before it even checks the email/password credentials.
const PUBLIC_ENDPOINTS = [
  '/sign-in',
  '/sign-up',
  '/confirm',
  '/forgot',
  '/reset',
  '/resend-verification',
  '/ping',
  '/invite/',
];

const isPublicEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((pub) => url.includes(pub));
};

// Add JWT token to requests, skipping public endpoints
const addAuthInterceptor = (instance: typeof treeApi) => {
  instance.interceptors.request.use(
    (config) => {
      // Never attach Authorization to public endpoints — an expired token
      // would cause the backend to reject the request with 401 before
      // checking credentials (sign-in) or processing the action (sign-up etc.)
      if (!isPublicEndpoint(config.url)) {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
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
        // a 401 on them should not kick the user out (e.g. notification polling)
        const requestUrl = error.config?.url || '';
        const isBackgroundRequest = requestUrl.includes('/notifications');
        // Don't logout on public endpoint 401s — those are credential errors,
        // not session expiry (and the token was not sent anyway after this fix)
        const isPublic = isPublicEndpoint(requestUrl);
        if (!isPublicPage && !isBackgroundRequest && !isPublic) {
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
