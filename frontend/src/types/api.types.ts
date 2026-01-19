/**
 * Общие типы для API ответов
 */

// Базовый ответ API
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp?: string;
}

// Пагинация
export interface Pageable {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageResponse<T> {
  content: T[];
  pageable: Pageable;
}

// Ошибка API
export interface ApiError {
  message: string;
  code?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}
