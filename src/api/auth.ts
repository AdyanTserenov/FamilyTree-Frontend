import { authApi } from './axiosConfig';
import type { ApiResponse, AuthResponse, SignInRequest, SignUpRequest, User } from '../types';

export const authService = {
  signUp: async (data: SignUpRequest): Promise<ApiResponse<null>> => {
    const response = await authApi.post<ApiResponse<null>>('/sign-up', data);
    return response.data;
  },

  signIn: async (data: SignInRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await authApi.post<ApiResponse<AuthResponse>>('/sign-in', data);
    return response.data;
  },

  confirmEmail: async (token: string): Promise<ApiResponse<null>> => {
    const response = await authApi.get<ApiResponse<null>>(`/confirm?token=${token}`);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await authApi.post<ApiResponse<null>>('/forgot', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<null>> => {
    const response = await authApi.post<ApiResponse<null>>('/reset', { token, newPassword });
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await authApi.get<ApiResponse<User>>('/profile');
    return response.data;
  },
};
