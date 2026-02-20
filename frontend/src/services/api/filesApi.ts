import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';
import type { FileInfo } from '@/types/files.types';

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export const filesApi = {
  /**
   * Получить список файлов директории.
   * Обычный пользователь — только своя папка.
   * Администратор — любая директория (включая чужие).
   */
  listFiles: async (path: string, isAdmin: boolean): Promise<FileInfo[]> => {
    const endpoint = isAdmin ? API_ENDPOINTS.FILES.ADMIN.LIST : API_ENDPOINTS.FILES.USER.LIST;
    const { data } = await apiClient.get<FileInfo[]>(endpoint, { params: { path } });
    return data;
  },

  /**
   * Загрузить файлы в директорию.
   * При загрузке папки передаётся relativePaths — массив webkitRelativePath
   * для каждого файла (порядок соответствует порядку files).
   */
  uploadFiles: async (
    files: File[],
    path: string,
    isAdmin: boolean,
    relativePaths?: string[],
    onProgress?: (percent: number) => void
  ): Promise<void> => {
    const endpoint = isAdmin ? API_ENDPOINTS.FILES.ADMIN.UPLOAD : API_ENDPOINTS.FILES.USER.UPLOAD;
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    if (relativePaths) {
      relativePaths.forEach((rp) => formData.append('relativePaths', rp));
    }
    await apiClient.post(endpoint, formData, {
      params: { path },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
  },

  /** Создать директорию (path включает имя новой папки) */
  createDir: async (path: string, isAdmin: boolean): Promise<void> => {
    const endpoint = isAdmin
      ? API_ENDPOINTS.FILES.ADMIN.CREATE_DIR
      : API_ENDPOINTS.FILES.USER.CREATE_DIR;
    await apiClient.post(endpoint, null, { params: { path } });
  },

  /** Удалить файл или директорию */
  deleteItem: async (path: string, isAdmin: boolean): Promise<void> => {
    const endpoint = isAdmin ? API_ENDPOINTS.FILES.ADMIN.DELETE : API_ENDPOINTS.FILES.USER.DELETE;
    await apiClient.delete(endpoint, { params: { path } });
  },

  /** Скачать файл */
  downloadFile: async (path: string, isAdmin: boolean): Promise<void> => {
    const endpoint = isAdmin
      ? API_ENDPOINTS.FILES.ADMIN.DOWNLOAD
      : API_ENDPOINTS.FILES.USER.DOWNLOAD;
    const { data } = await apiClient.get<Blob>(endpoint, {
      params: { path },
      responseType: 'blob',
    });
    const fileName = path.split('/').pop() ?? 'download';
    triggerDownload(data, fileName);
  },

  /** Скачать директорию как ZIP */
  downloadZip: async (path: string, isAdmin: boolean): Promise<void> => {
    const endpoint = isAdmin
      ? API_ENDPOINTS.FILES.ADMIN.DOWNLOAD_ZIP
      : API_ENDPOINTS.FILES.USER.DOWNLOAD_ZIP;
    const { data } = await apiClient.get<Blob>(endpoint, {
      params: { path },
      responseType: 'blob',
    });
    const folderName = path.split('/').pop() ?? 'folder';
    triggerDownload(data, `${folderName}.zip`);
  },
};