import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  SlurmQosListResponse,
  SlurmTresItem,
  CreateQosRequest,
  SetAssociationQosRequest,
  SetAssociationLimitsRequest,
} from '@/types/slurm-qos.types';

export const slurmQosApi = {
  // ── TRES ──────────────────────────────────────────────────────────────────

  getTresList: (): Promise<SlurmTresItem[]> =>
    apiClient.get<SlurmTresItem[]>(API_ENDPOINTS.SLURM.TRES).then((r) => r.data),

  // ── QOS CRUD ──────────────────────────────────────────────────────────────

  getQosList: (): Promise<SlurmQosListResponse> =>
    apiClient.get<SlurmQosListResponse>(API_ENDPOINTS.SLURM.QOS_LIST).then((r) => r.data),

  createQos: (data: CreateQosRequest): Promise<void> =>
    apiClient.post(API_ENDPOINTS.SLURM.QOS_LIST, data).then(() => undefined),

  modifyQos: (name: string, data: CreateQosRequest): Promise<void> =>
    apiClient.put(API_ENDPOINTS.SLURM.QOS(name), data).then(() => undefined),

  deleteQos: (name: string): Promise<void> =>
    apiClient.delete(API_ENDPOINTS.SLURM.QOS(name)).then(() => undefined),

  // ── Association QOS / Limits ───────────────────────────────────────────────

  setAssociationQos: (data: SetAssociationQosRequest): Promise<void> =>
    apiClient.put(API_ENDPOINTS.SLURM.ASSOCIATIONS_QOS, data).then(() => undefined),

  setAssociationLimits: (data: SetAssociationLimitsRequest): Promise<void> =>
    apiClient.put(API_ENDPOINTS.SLURM.ASSOCIATIONS_LIMITS, data).then(() => undefined),
};