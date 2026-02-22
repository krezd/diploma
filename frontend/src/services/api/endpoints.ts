export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    REGISTRATION_STATUS: '/auth/registration-status',
  },
  USERS: {
    ME: '/users/me',
    ME_PASSWORD: '/users/me/password',
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (username: string) => `/users/${username}`,
    DELETE: (username: string) => `/users/${username}`,
    SETTINGS_REGISTRATION: '/users/settings/registration',
  },
  SLURM: {
    JOBS: '/slurm/jobs',
    USER_JOBS: '/slurm/user/jobs',
    JOB: (id: number) => `/slurm/job/${id}`,
    JOB_SUBMIT: '/slurm/job/submit',
    NODES: '/slurm/nodes',
    NODE: (name: string) => `/slurm/node/${name}`,
    PARTITIONS: '/slurm/partitions',
    PARTITION: (name: string) => `/slurm/partition/${name}`,
    DIAG: '/slurm/diag',
    PING: '/slurm/ping',
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