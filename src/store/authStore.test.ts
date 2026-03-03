import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, JWT_TOKEN_KEY } from './authStore';
import type { User } from '../types';

// Reset the store before each test.
// The setup file (src/test/setup.ts) installs an in-memory localStorage mock
// globally, so zustand persist works correctly in all test environments.
beforeEach(() => {
  localStorage.clear();
  useAuthStore.getState().logout();
});

const mockUser: User = {
  id: 1,
  firstName: 'Иван',
  lastName: 'Иванов',
  middleName: 'Иванович',
  email: 'ivan@test.com',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('authStore', () => {
  describe('начальное состояние', () => {
    it('пользователь не аутентифицирован по умолчанию', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('устанавливает пользователя, токен и isAuthenticated = true', () => {
      useAuthStore.getState().setAuth(mockUser, 'jwt.token.here');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('jwt.token.here');
    });

    it('перезаписывает предыдущее состояние', () => {
      useAuthStore.getState().setAuth(mockUser, 'old-token');
      const newUser: User = { ...mockUser, id: 2, email: 'new@test.com' };
      useAuthStore.getState().setAuth(newUser, 'new-token');

      const state = useAuthStore.getState();
      expect(state.token).toBe('new-token');
      expect(state.user?.email).toBe('new@test.com');
    });
  });

  describe('setUser', () => {
    it('обновляет только пользователя, не трогая токен', () => {
      useAuthStore.getState().setAuth(mockUser, 'jwt.token.here');
      const updatedUser: User = { ...mockUser, firstName: 'Пётр' };
      useAuthStore.getState().setUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user?.firstName).toBe('Пётр');
      expect(state.token).toBe('jwt.token.here');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('очищает пользователя, токен и isAuthenticated', () => {
      useAuthStore.getState().setAuth(mockUser, 'jwt.token.here');
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });
  });

  describe('JWT_TOKEN_KEY', () => {
    it('ключ persist равен "jwt_token"', () => {
      expect(JWT_TOKEN_KEY).toBe('jwt_token');
    });
  });
});
