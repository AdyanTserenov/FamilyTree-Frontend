import { authApi, treeApi } from './axiosConfig';
import type { AuthApiResponse, ApiResponse, AuthResponse, SignInRequest, SignUpRequest, User } from '../types';

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  // ── auth-service endpoints (authApi → /api/auth → auth-service /auth) ──────
  // These return AuthApiResponse: { status, data, error }

  signUp: async (data: SignUpRequest): Promise<AuthApiResponse<null>> => {
    const response = await authApi.post<AuthApiResponse<null>>('/sign-up', data);
    return response.data;
  },

  signIn: async (data: SignInRequest): Promise<AuthApiResponse<AuthResponse>> => {
    const response = await authApi.post<AuthApiResponse<AuthResponse>>('/sign-in', data);
    return response.data;
  },

  confirmEmail: async (token: string): Promise<AuthApiResponse<null>> => {
    const response = await authApi.get<AuthApiResponse<null>>(`/confirm?token=${token}`);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<AuthApiResponse<null>> => {
    const response = await authApi.post<AuthApiResponse<null>>('/forgot', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<AuthApiResponse<null>> => {
    const response = await authApi.post<AuthApiResponse<null>>('/reset', { token, newPassword });
    return response.data;
  },

  resendVerification: async (email: string): Promise<AuthApiResponse<null>> => {
    const response = await authApi.post<AuthApiResponse<null>>('/resend-verification', { email });
    return response.data;
  },

  // ── profile endpoints (treeApi → /api/profile → auth-service /profile) ─────
  // These also return AuthApiResponse: { status, data, error }

  getProfile: async (): Promise<AuthApiResponse<User>> => {
    const response = await treeApi.get<AuthApiResponse<User>>('/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<AuthApiResponse<User>> => {
    const response = await treeApi.patch<AuthApiResponse<User>>('/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<AuthApiResponse<null>> => {
    const response = await treeApi.post<AuthApiResponse<null>>('/profile/change-password', data);
    return response.data;
  },

  deleteAccount: async (): Promise<AuthApiResponse<string>> => {
    const response = await treeApi.delete<AuthApiResponse<string>>('/profile');
    return response.data;
  },
};

// Re-export ApiResponse so other files can import it from here if needed
export type { ApiResponse };
