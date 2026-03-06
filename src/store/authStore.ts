import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { isTokenExpired } from '../utils/jwtUtils';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

// Ключ для хранения токена в localStorage (используется также в axiosConfig)
export const JWT_TOKEN_KEY = 'jwt_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user: User, token: string) => {
        // Токен хранится только через zustand persist — дублирование в localStorage убрано.
        // axiosConfig читает 'jwt_token' — zustand persist пишет его туда автоматически
        // через partialize, поэтому явный localStorage.setItem не нужен.
        set({ user, token, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: JWT_TOKEN_KEY,
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      // On hydration from localStorage, silently clear the store if the JWT is expired.
      // This prevents the user from being stuck in an authenticated-but-expired state
      // that would cause "Токен просрочен" errors on every page load.
      onRehydrateStorage: () => (state) => {
        if (state?.token && isTokenExpired(state.token)) {
          state.logout();
        }
      },
    }
  )
);
