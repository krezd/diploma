export interface UserDto {
  id: number;
  username: string;
  name: string;
  role: 'REGULAR' | 'ADMIN';
  createdAt: string;
  updatedAt: string | null;
}

export interface AdminUserCreateRequest {
  username: string;
  password: string;
  name: string;
  role: 'REGULAR' | 'ADMIN';
  account?: string;
}

export interface AdminUserUpdateRequest {
  name?: string;
  role?: 'REGULAR' | 'ADMIN';
}

export interface UpdateProfileRequest {
  name: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}