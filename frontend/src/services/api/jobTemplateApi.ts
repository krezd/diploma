import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type { JobTemplate, JobTemplateRequest } from '../../types/job-template.types';

export const jobTemplateApi = {
  getTemplates: async (): Promise<JobTemplate[]> => {
    const { data } = await apiClient.get<JobTemplate[]>(API_ENDPOINTS.JOB_TEMPLATES.LIST);
    return data;
  },

  createTemplate: async (request: JobTemplateRequest): Promise<JobTemplate> => {
    const { data } = await apiClient.post<JobTemplate>(API_ENDPOINTS.JOB_TEMPLATES.CREATE, request);
    return data;
  },

  updateTemplate: async (id: number, request: JobTemplateRequest): Promise<JobTemplate> => {
    const { data } = await apiClient.put<JobTemplate>(API_ENDPOINTS.JOB_TEMPLATES.UPDATE(id), request);
    return data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.JOB_TEMPLATES.DELETE(id));
  },
};