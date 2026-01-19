import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Базовый API клиент для взаимодействия с Spring Boot бэкендом
 * 
 * Как это работает:
 * 1. Создается axios instance с базовым URL
 * 2. Добавляются interceptors для автоматической обработки:
 *    - JWT токенов в заголовках
 *    - Ошибок API
 *    - Loading состояний
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Создаем axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 секунд для SLURM операций
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - добавляет JWT токен к каждому запросу
apiClient.interceptors.request.use(
  (config) => {
    // Получаем токен из localStorage (или другого места хранения)
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - обрабатывает ошибки
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Обработка различных типов ошибок
    if (error.response) {
      // Сервер ответил с ошибкой
      switch (error.response.status) {
        case 401:
          // Неавторизован - редирект на login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          console.error('Доступ запрещен');
          break;
        case 404:
          console.error('Ресурс не найден');
          break;
        case 500:
          console.error('Ошибка сервера');
          break;
        default:
          console.error('Неизвестная ошибка:', error.response.status);
      }
    } else if (error.request) {
      // Запрос отправлен, но нет ответа
      console.error('Нет ответа от сервера. Проверьте подключение.');
    } else {
      // Ошибка при настройке запроса
      console.error('Ошибка запроса:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
