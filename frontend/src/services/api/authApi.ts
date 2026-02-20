import axios from 'axios';
import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type { LoginRequest, RegisterRequest, AuthTokens } from '@/types/auth.types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthTokens> => {
    const { data } = await axios.post<AuthTokens>('/api' + API_ENDPOINTS.AUTH.LOGIN, credentials);
    return data;
  },

  register: async (request: RegisterRequest): Promise<AuthTokens> => {
    const { data } = await axios.post<AuthTokens>('/api' + API_ENDPOINTS.AUTH.REGISTER, request);
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  },
};