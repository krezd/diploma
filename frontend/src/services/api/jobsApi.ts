import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  SlurmJobsResponse,
  SlurmDbJobsResponse,
  BatchJobSubmitRequest,
  SlurmJobSubmitResponse,
  SlurmJobDescMsg,
  JobUsageStats,
} from '../../types/job.types';

// ── Активные задания (slurmctld) ──────────────────────────────────────────

export const jobsApi = {
  /** Все задания кластера. Только ADMIN. */
  getAllJobs: async (params?: { update_time?: number; flags?: string }): Promise<SlurmJobsResponse> => {
    const { data } = await apiClient.get<SlurmJobsResponse>(API_ENDPOINTS.SLURM.JOBS, { params });
    return data;
  },

  /** Задания текущего авторизованного пользователя. */
  getUserJobs: async (params?: { update_time?: number; flags?: string }): Promise<SlurmJobsResponse> => {
    const { data } = await apiClient.get<SlurmJobsResponse>(API_ENDPOINTS.SLURM.USER_JOBS, { params });
    return data;
  },

  /** Задание по идентификатору. */
  getJobById: async (id: number, params?: { update_time?: number; flags?: string }): Promise<SlurmJobsResponse> => {
    const { data } = await apiClient.get<SlurmJobsResponse>(API_ENDPOINTS.SLURM.JOB(id), { params });
    return data;
  },

  // ── Отправка / отмена / обновление ──────────────────────────────────────

  /** Отправить новое задание в очередь SLURM через sbatch CLI. */
  submitJob: async (request: BatchJobSubmitRequest): Promise<SlurmJobSubmitResponse> => {
    const { data } = await apiClient.post<SlurmJobSubmitResponse>(
      API_ENDPOINTS.SLURM.JOB_SUBMIT,
      request,
    );
    return data;
  },

  /**
   * Отменить задание (DELETE).
   * @param signal  POSIX-сигнал (опционально, по умолчанию SIGKILL)
   * @param flags   флаги отмены (BATCH_JOB, ARRAY_TASK, FULL_JOB и др.)
   */
  cancelJob: async (id: number, params?: { signal?: string; flags?: string }): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.SLURM.JOB_CANCEL(id), { params });
  },

  /** Обновить параметры задания. Только ADMIN. */
  updateJob: async (id: number, request: SlurmJobDescMsg): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.SLURM.JOB_UPDATE(id), request);
  },

  // ── Архивные задания (slurmdbd) ──────────────────────────────────────────

  /** Все завершённые задания из slurmdbd. Только ADMIN. */
  getArchivedJobs: async (params?: {
    start_time?: string;
    end_time?: string;
    state?: string;
  }): Promise<SlurmDbJobsResponse> => {
    const { data } = await apiClient.get<SlurmDbJobsResponse>(
      API_ENDPOINTS.SLURM.JOBS_HISTORY,
      { params },
    );
    return data;
  },

  /** Завершённые задания текущего пользователя из slurmdbd. */
  getUserArchivedJobs: async (params?: {
    start_time?: string;
    end_time?: string;
  }): Promise<SlurmDbJobsResponse> => {
    const { data } = await apiClient.get<SlurmDbJobsResponse>(
      API_ENDPOINTS.SLURM.USER_JOBS_HISTORY,
      { params },
    );
    return data;
  },

  /** Архивное задание по идентификатору из slurmdbd. */
  getArchivedJobById: async (id: number): Promise<SlurmDbJobsResponse> => {
    const { data } = await apiClient.get<SlurmDbJobsResponse>(API_ENDPOINTS.SLURM.JOB_HISTORY(id));
    return data;
  },

  // ── Usage статистика ─────────────────────────────────────────────────────

  /** Агрегированная usage-статистика по всем заданиям. Только ADMIN. */
  getJobUsageStats: async (params?: {
    start_time?: string;
    end_time?: string;
  }): Promise<JobUsageStats> => {
    const { data } = await apiClient.get<JobUsageStats>(API_ENDPOINTS.SLURM.JOBS_USAGE, { params });
    return data;
  },

  /** Usage-статистика по заданиям текущего пользователя. */
  getUserJobUsageStats: async (params?: {
    start_time?: string;
    end_time?: string;
  }): Promise<JobUsageStats> => {
    const { data } = await apiClient.get<JobUsageStats>(
      API_ENDPOINTS.SLURM.USER_JOBS_USAGE,
      { params },
    );
    return data;
  },
};