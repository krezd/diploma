import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  SlurmAccountsResponse,
  SlurmAssociationsResponse,
  CreateAccountRequest,
  AssociateUserRequest,
} from '@/types/slurm-account.types';

export const slurmAccountApi = {
  // ── Аккаунты ──────────────────────────────────────────────────────────────

  getAccounts: (): Promise<SlurmAccountsResponse> =>
    apiClient.get<SlurmAccountsResponse>(API_ENDPOINTS.SLURM.ACCOUNTS).then((r) => r.data),

  createAccount: (data: CreateAccountRequest): Promise<void> =>
    apiClient.post(API_ENDPOINTS.SLURM.ACCOUNTS, data).then(() => undefined),

  deleteAccount: (name: string): Promise<void> =>
    apiClient.delete(API_ENDPOINTS.SLURM.ACCOUNT(name)).then(() => undefined),

  // ── Ассоциации ────────────────────────────────────────────────────────────

  getAssociations: (params?: { account?: string; user?: string }): Promise<SlurmAssociationsResponse> =>
    apiClient
      .get<SlurmAssociationsResponse>(API_ENDPOINTS.SLURM.ASSOCIATIONS, { params })
      .then((r) => r.data),

  createAssociation: (data: AssociateUserRequest): Promise<void> =>
    apiClient.post(API_ENDPOINTS.SLURM.ASSOCIATIONS, data).then(() => undefined),

  deleteAssociation: (username: string, accountName: string): Promise<void> =>
    apiClient
      .delete(API_ENDPOINTS.SLURM.ASSOCIATIONS, { params: { username, accountName } })
      .then(() => undefined),
};