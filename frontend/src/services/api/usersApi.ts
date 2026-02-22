import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  UserDto,
  AdminUserCreateRequest,
  AdminUserUpdateRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types/user.types';

export const usersApi = {
  // ── Профиль текущего пользователя ────────────────────────────────────────

  getMe: (): Promise<UserDto> =>
    apiClient.get<UserDto>(API_ENDPOINTS.USERS.ME).then((r) => r.data),

  updateMe: (data: UpdateProfileRequest): Promise<UserDto> =>
    apiClient.put<UserDto>(API_ENDPOINTS.USERS.ME, data).then((r) => r.data),

  changePassword: (data: ChangePasswordRequest): Promise<void> =>
    apiClient.put(API_ENDPOINTS.USERS.ME_PASSWORD, data).then(() => undefined),

  // ── Управление пользователями (ADMIN) ────────────────────────────────────

  getAll: (): Promise<UserDto[]> =>
    apiClient.get<UserDto[]>(API_ENDPOINTS.USERS.LIST).then((r) => r.data),

  create: (data: AdminUserCreateRequest): Promise<UserDto> =>
    apiClient.post<UserDto>(API_ENDPOINTS.USERS.CREATE, data).then((r) => r.data),

  update: (username: string, data: AdminUserUpdateRequest): Promise<UserDto> =>
    apiClient
      .put<UserDto>(API_ENDPOINTS.USERS.UPDATE(username), data)
      .then((r) => r.data),

  remove: (username: string): Promise<void> =>
    apiClient.delete(API_ENDPOINTS.USERS.DELETE(username)).then(() => undefined),

  // ── Настройки регистрации (ADMIN) ─────────────────────────────────────────

  getRegistrationSetting: (): Promise<{ enabled: boolean }> =>
    apiClient
      .get<{ enabled: boolean }>(API_ENDPOINTS.USERS.SETTINGS_REGISTRATION)
      .then((r) => r.data),

  setRegistrationSetting: (enabled: boolean): Promise<{ enabled: boolean }> =>
    apiClient
      .put<{ enabled: boolean }>(API_ENDPOINTS.USERS.SETTINGS_REGISTRATION, { enabled })
      .then((r) => r.data),
};