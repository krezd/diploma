import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

export interface ClusterNode {
  name: string;
  state: string[];
  cpus: number;
  alloc_cpus: number;
  real_memory: number;
  alloc_memory: number;
  partitions: string[];
}

export const clusterApi = {
  getNodes: async (): Promise<ClusterNode[]> => {
    const { data } = await apiClient.get<ClusterNode[]>(API_ENDPOINTS.SLURM.NODES);
    return data;
  },

  getNode: async (name: string): Promise<ClusterNode> => {
    const { data } = await apiClient.get<ClusterNode>(API_ENDPOINTS.SLURM.NODE(name));
    return data;
  },

  deleteNode: async (name: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.SLURM.NODE(name));
  },
};