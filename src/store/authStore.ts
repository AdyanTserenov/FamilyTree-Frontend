import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

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
    }
  )
);
