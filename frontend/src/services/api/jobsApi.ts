import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

export interface SlurmJob {
  job_id: number;
  name: string;
  job_state: string[];
  user_name: string;
  partition: string;
  nodes: string;
  num_cpus: number;
  time_limit: { number: number; set: boolean };
  submit_time: { number: number; set: boolean };
  start_time?: { number: number; set: boolean };
  end_time?: { number: number; set: boolean };
}

export const jobsApi = {
  getAllJobs: async (): Promise<SlurmJob[]> => {
    const { data } = await apiClient.get<SlurmJob[]>(API_ENDPOINTS.SLURM.JOBS);
    return data;
  },

  getUserJobs: async (): Promise<SlurmJob[]> => {
    const { data } = await apiClient.get<SlurmJob[]>(API_ENDPOINTS.SLURM.USER_JOBS);
    return data;
  },

  getJob: async (id: number): Promise<SlurmJob> => {
    const { data } = await apiClient.get<SlurmJob>(API_ENDPOINTS.SLURM.JOB(id));
    return data;
  },
};