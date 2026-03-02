import axios from 'axios';

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

// Читает JWT из zustand persist хранилища (ключ 'jwt_token', поле token внутри JSON)
const getToken = (): string | null => {
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
        localStorage.removeItem('jwt_token');
        const currentPath = window.location.pathname + window.location.search;
        const redirect = currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
        window.location.href = `/login${redirect}`;
      }
      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(authApi);
addAuthInterceptor(treeApi);
