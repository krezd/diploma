import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type { Job, JobSubmitRequest, JobOutput, ApiResponse, PageResponse } from '@/types';

/**
 * API методы для работы с SLURM Jobs
 * 
 * Все методы автоматически используют apiClient, который:
 * - Добавляет базовый URL
 * - Добавляет JWT токен в заголовки
 * - Обрабатывает ошибки
 */

export const jobsApi = {
  /**
   * Получить список всех jobs
   */
  getJobs: async (params?: { page?: number; size?: number; status?: string }): Promise<PageResponse<Job>> => {
    const response = await apiClient.get<ApiResponse<PageResponse<Job>>>(API_ENDPOINTS.JOBS.LIST, { params });
    return response.data.data;
  },

  /**
   * Получить job по ID
   */
  getJob: async (jobId: string | number): Promise<Job> => {
    const response = await apiClient.get<ApiResponse<Job>>(API_ENDPOINTS.JOBS.GET(jobId));
    return response.data.data;
  },

  /**
   * Отправить новый job в SLURM
   */
  submitJob: async (jobRequest: JobSubmitRequest): Promise<Job> => {
    const response = await apiClient.post<ApiResponse<Job>>(API_ENDPOINTS.JOBS.SUBMIT, jobRequest);
    return response.data.data;
  },

  /**
   * Отменить job
   */
  cancelJob: async (jobId: string | number): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.JOBS.CANCEL(jobId));
  },

  /**
   * Получить статус job
   */
  getJobStatus: async (jobId: string | number): Promise<Job> => {
    const response = await apiClient.get<ApiResponse<Job>>(API_ENDPOINTS.JOBS.STATUS(jobId));
    return response.data.data;
  },

  /**
   * Получить output job (stdout/stderr)
   */
  getJobOutput: async (jobId: string | number): Promise<JobOutput> => {
    const response = await apiClient.get<ApiResponse<JobOutput>>(API_ENDPOINTS.JOBS.OUTPUT(jobId));
    return response.data.data;
  },
};
