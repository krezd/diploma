# Интеграция Frontend с Spring Boot Backend

## Как работает связь Frontend ↔ Backend

### 1. Архитектура взаимодействия

```
┌─────────────────┐         HTTP/REST         ┌─────────────────┐
│                 │ ◄────────────────────────► │                 │
│  React Frontend │         WebSocket          │  Spring Boot    │
│   (Vite Dev)    │ ◄────────────────────────► │   Backend       │
│   :3000         │                            │   :8080         │
└─────────────────┘                            └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   SLURM REST    │
                                                │   (slurmrestd)  │
                                                └─────────────────┘
```

### 2. API Клиент (Axios)

**Расположение**: `src/services/api/client.ts`

**Как работает**:
- Использует `axios.create()` для создания instance с базовым URL
- Автоматически добавляет JWT токен из `localStorage` в заголовок `Authorization: Bearer <token>`
- Перехватывает ответы и обрабатывает ошибки (401, 403, 500)
- Базовый URL берется из переменной окружения `VITE_API_BASE_URL`

**Пример использования**:
```typescript
import apiClient from '@/services/api/client';
const response = await apiClient.get('/v1/jobs');
```

### 3. Структура API эндпоинтов

Все эндпоинты определены в `src/services/api/endpoints.ts`:

- **Аутентификация**: `/api/auth/*`
- **Jobs**: `/api/v1/jobs/*`
- **Кластер**: `/api/v1/cluster/*`
- **Очереди**: `/api/v1/queues/*`
- **Статистика**: `/api/v1/stats/*`

### 4. Vite Proxy (для разработки)

**Файл**: `vite.config.ts`

В режиме разработки Vite проксирует все запросы с `/api` на Spring Boot:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

**Как это работает**:
- Frontend делает запрос: `fetch('/api/v1/jobs')`
- Vite перехватывает и перенаправляет на: `http://localhost:8080/api/v1/jobs`
- Это решает проблему CORS в разработке

### 5. CORS настройка в Spring Boot

**Вам нужно добавить в Spring Boot**:

Создайте класс конфигурации:

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:3000") // Vite dev server
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
```

Или через `application.properties`:
```properties
spring.web.cors.allowed-origins=http://localhost:3000
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true
```

### 6. Аутентификация (JWT)

**Flow**:
1. Пользователь логинится через `/api/auth/login`
2. Backend возвращает JWT токен
3. Frontend сохраняет токен в `localStorage`
4. Каждый следующий запрос автоматически добавляет заголовок `Authorization: Bearer <token>`
5. При 401 ошибке - редирект на `/login`

**Реализация**: см. `src/services/api/client.ts` - interceptor

### 7. Обработка ошибок

API клиент автоматически обрабатывает:
- **401 Unauthorized** → редирект на `/login`, удаление токена
- **403 Forbidden** → логирование ошибки
- **404 Not Found** → логирование
- **500 Server Error** → логирование

Все ошибки логируются в консоль браузера.

## Сборка и развертывание

### Разработка

1. **Запустить Backend**:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

2. **Запустить Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Открыть `http://localhost:3000`

### Продакшен сборка

**Вариант 1: Отдельный Nginx сервер**

1. Собрать фронтенд:
   ```bash
   cd frontend
   npm run build
   ```
   Файлы будут в `frontend/dist/`

2. Развернуть на Nginx:
   - Скопировать `dist/` на сервер
   - Настроить Nginx:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend
       location / {
           root /var/www/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       # Backend API
       location /api {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. Обновить `.env.production` с реальным URL

**Вариант 2: Интеграция с Spring Boot**

1. Собрать фронтенд:
   ```bash
   cd frontend
   npm run build
   ```

2. Скопировать в Spring Boot static:
   ```bash
   cp -r frontend/dist/* backend/src/main/resources/static/
   ```

3. Spring Boot будет раздавать фронтенд статически

4. Обновить `CorsConfig` для продакшен домена

### Переменные окружения

**Development** (`.env.development`):
```
VITE_API_BASE_URL=http://localhost:8080/api
```

**Production** (`.env.production`):
```
VITE_API_BASE_URL=https://your-production-server.com/api
```

⚠️ **Важно**: Vite использует `VITE_` префикс для переменных окружения, доступных в коде.

## Проверка интеграции

1. Запустить Backend и Frontend
2. Открыть DevTools (F12) → Network
3. Проверить, что запросы идут на правильный URL
4. Проверить заголовки (должен быть `Authorization` если залогинен)
5. Проверить CORS заголовки в ответе

## Troubleshooting

**CORS ошибки**:
- Проверить настройки CORS в Spring Boot
- Убедиться, что Vite proxy настроен правильно
- Проверить, что `VITE_API_BASE_URL` правильный

**401 Unauthorized**:
- Проверить наличие токена в `localStorage`
- Проверить формат токена в заголовке
- Проверить, что токен не истек

**503 Service Unavailable**:
- Проверить, что Spring Boot запущен
- Проверить URL в `VITE_API_BASE_URL`
