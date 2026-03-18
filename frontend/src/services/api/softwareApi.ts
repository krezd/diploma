import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type { SoftwarePackage, ScanResult, RegisterSoftwareRequest, UpdateSoftwareRequest, PackageStatus } from '@/types/software.types';

export const softwareApi = {
  getAll: async (): Promise<SoftwarePackage[]> => {
    const { data } = await apiClient.get<SoftwarePackage[]>(API_ENDPOINTS.SOFTWARE.LIST);
    return data;
  },

  scan: async (): Promise<ScanResult> => {
    const { data } = await apiClient.post<ScanResult>(API_ENDPOINTS.SOFTWARE.SCAN);
    return data;
  },

  register: async (req: RegisterSoftwareRequest): Promise<SoftwarePackage> => {
    const { data } = await apiClient.post<SoftwarePackage>(API_ENDPOINTS.SOFTWARE.REGISTER, req);
    return data;
  },

  upload: async (formData: FormData): Promise<SoftwarePackage> => {
    const { data } = await apiClient.post<SoftwarePackage>(API_ENDPOINTS.SOFTWARE.UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateMetadata: async (id: number, req: UpdateSoftwareRequest): Promise<SoftwarePackage> => {
    const { data } = await apiClient.patch<SoftwarePackage>(API_ENDPOINTS.SOFTWARE.UPDATE(id), req);
    return data;
  },

  getModulefile: async (id: number): Promise<{ content: string }> => {
    const { data } = await apiClient.get<{ content: string }>(API_ENDPOINTS.SOFTWARE.MODULEFILE(id));
    return data;
  },

  updateStatus: async (id: number, status: PackageStatus): Promise<SoftwarePackage> => {
    const { data } = await apiClient.patch<SoftwarePackage>(API_ENDPOINTS.SOFTWARE.STATUS(id), null, {
      params: { status },
    });
    return data;
  },

  delete: async (id: number, deleteFiles = false): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.SOFTWARE.DELETE(id), { params: { deleteFiles } });
  },
};