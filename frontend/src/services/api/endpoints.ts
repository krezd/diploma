/**
 * Константы эндпоинтов Spring Boot API
 * 
 * Структура:
 * /api/v1/jobs/* - для работы с SLURM jobs
 * /api/v1/cluster/* - для мониторинга кластера
 * /api/v1/queues/* - для работы с очередями
 * /api/auth/* - для аутентификации
 */

export const API_ENDPOINTS = {
  // Аутентификация
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },

  // SLURM Jobs
  JOBS: {
    BASE: '/v1/jobs',
    LIST: '/v1/jobs',
    GET: (jobId: string | number) => `/v1/jobs/${jobId}`,
    SUBMIT: '/v1/jobs/submit',
    CANCEL: (jobId: string | number) => `/v1/jobs/${jobId}/cancel`,
    OUTPUT: (jobId: string | number) => `/v1/jobs/${jobId}/output`,
    STATUS: (jobId: string | number) => `/v1/jobs/${jobId}/status`,
  },

  // Кластер
  CLUSTER: {
    BASE: '/v1/cluster',
    STATUS: '/v1/cluster/status',
    NODES: '/v1/cluster/nodes',
    NODE: (nodeId: string) => `/v1/cluster/nodes/${nodeId}`,
    RESOURCES: '/v1/cluster/resources',
  },

  // Очереди
  QUEUES: {
    BASE: '/v1/queues',
    LIST: '/v1/queues',
    GET: (queueName: string) => `/v1/queues/${queueName}`,
  },

  // Статистика
  STATS: {
    DASHBOARD: '/v1/stats/dashboard',
    JOBS: '/v1/stats/jobs',
    RESOURCES: '/v1/stats/resources',
  },
} as const;
