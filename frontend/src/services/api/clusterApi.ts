import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  SlurmNodesResponse,
  SlurmPartitionsResponse,
  SlurmDiagResponse,
  SlurmPingResponse,
  UpdateNodeRequest,
} from '@/types/cluster.types';

export const clusterApi = {
  getNodes: (): Promise<SlurmNodesResponse> =>
    apiClient.get<SlurmNodesResponse>(API_ENDPOINTS.SLURM.NODES).then((r) => r.data),

  getNode: (name: string): Promise<SlurmNodesResponse> =>
    apiClient.get<SlurmNodesResponse>(API_ENDPOINTS.SLURM.NODE(name)).then((r) => r.data),

  updateNode: (name: string, request: UpdateNodeRequest): Promise<void> =>
    apiClient.post(API_ENDPOINTS.SLURM.NODE(name), request).then(() => undefined),

  getPartitions: (): Promise<SlurmPartitionsResponse> =>
    apiClient.get<SlurmPartitionsResponse>(API_ENDPOINTS.SLURM.PARTITIONS).then((r) => r.data),

  getDiag: (): Promise<SlurmDiagResponse> =>
    apiClient.get<SlurmDiagResponse>(API_ENDPOINTS.SLURM.DIAG).then((r) => r.data),

  getPing: (): Promise<SlurmPingResponse> =>
    apiClient.get<SlurmPingResponse>(API_ENDPOINTS.SLURM.PING).then((r) => r.data),
};