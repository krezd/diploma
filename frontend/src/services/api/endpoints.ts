export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  SLURM: {
    JOBS: '/slurm/jobs',
    USER_JOBS: '/slurm/user/jobs',
    JOB: (id: number) => `/slurm/job/${id}`,
    NODES: '/slurm/nodes',
    NODE: (name: string) => `/slurm/node/${name}`,
  },
  FILES: {
    // Эндпоинты для любого авторизованного пользователя (путь в рамках своей папки)
    USER: {
      LIST: '/files/user/list',
      UPLOAD: '/files/user/upload',
      CREATE_DIR: '/files/user/createDir',
      DOWNLOAD: '/files/user/download',
      DOWNLOAD_ZIP: '/files/user/download-zip',
      DELETE: '/files/user/delete',
    },
    // Эндпоинты только для ADMIN (полный доступ ко всем директориям)
    ADMIN: {
      LIST: '/files/admin/list',
      UPLOAD: '/files/admin/upload',
      CREATE_DIR: '/files/admin/createDir',
      DOWNLOAD: '/files/admin/download',
      DOWNLOAD_ZIP: '/files/admin/download-zip',
      DELETE: '/files/admin/delete',
    },
  },
} as const;