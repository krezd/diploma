import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse } from '@/types';

/**
 * API методы для мониторинга кластера
 */

export interface ClusterNode {
  id: string;
  name: string;
  state: 'IDLE' | 'ALLOCATED' | 'DOWN' | 'MAINTENANCE';
  cpusTotal: number;
  cpusUsed: number;
  memoryTotal: string;
  memoryUsed: string;
  gpusTotal?: number;
  gpusUsed?: number;
}

export interface ClusterStatus {
  totalNodes: number;
  availableNodes: number;
  allocatedNodes: number;
  downNodes: number;
  totalCpus: number;
  usedCpus: number;
  totalMemory: string;
  usedMemory: string;
}

export const clusterApi = {
  /**
   * Получить общий статус кластера
   */
  getClusterStatus: async (): Promise<ClusterStatus> => {
    const response = await apiClient.get<ApiResponse<ClusterStatus>>(API_ENDPOINTS.CLUSTER.STATUS);
    return response.data.data;
  },

  /**
   * Получить список всех нод
   */
  getNodes: async (): Promise<ClusterNode[]> => {
    const response = await apiClient.get<ApiResponse<ClusterNode[]>>(API_ENDPOINTS.CLUSTER.NODES);
    return response.data.data;
  },

  /**
   * Получить информацию о конкретной ноде
   */
  getNode: async (nodeId: string): Promise<ClusterNode> => {
    const response = await apiClient.get<ApiResponse<ClusterNode>>(API_ENDPOINTS.CLUSTER.NODE(nodeId));
    return response.data.data;
  },
};
