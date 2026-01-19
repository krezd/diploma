# SLURM HPC Management Frontend

Frontend приложение для управления высокопроизводительными вычислениями на основе SLURM.

## Технологии

- **React 18** + **TypeScript**
- **Vite** - сборщик и dev server
- **Material-UI (MUI)** - UI компоненты
- **React Router** - роутинг
- **Axios** - HTTP клиент для API
- **Zustand** - управление состоянием
- **Recharts** - графики и визуализация

## Структура проекта

```
frontend/
├── src/
│   ├── components/      # React компоненты
│   ├── services/api/    # API клиент для Spring Boot
│   ├── types/           # TypeScript типы
│   ├── stores/          # Состояние (Zustand)
│   ├── pages/           # Страницы
│   └── utils/           # Утилиты
```

## Установка

```bash
cd frontend
npm install
```

## Разработка

```bash
npm run dev
```

Приложение запустится на `http://localhost:3000`

**Важно**: Убедитесь, что Spring Boot бэкенд запущен на `http://localhost:8080`

## Сборка для продакшена

```bash
npm run build
```

Собранные файлы будут в директории `dist/`

## Как работает связь с бэкендом

1. **API Клиент** (`src/services/api/client.ts`):
   - Использует Axios с базовым URL из `.env`
   - Автоматически добавляет JWT токен в заголовки
   - Обрабатывает ошибки (401, 403, 500 и т.д.)

2. **Эндпоинты** (`src/services/api/endpoints.ts`):
   - Константы всех API эндпоинтов Spring Boot
   - Структура: `/api/v1/jobs/*`, `/api/v1/cluster/*` и т.д.

3. **API методы** (`src/services/api/*Api.ts`):
   - Обертки для каждого эндпоинта
   - Типизированы TypeScript

4. **Vite Proxy** (`vite.config.ts`):
   - В dev режиме проксирует `/api` на `localhost:8080`
   - Решает CORS проблемы в разработке

## Переменные окружения

- `.env.development` - для разработки
- `.env.production` - для продакшена

Настройки:
- `VITE_API_BASE_URL` - базовый URL Spring Boot API
- `VITE_WS_URL` - WebSocket URL (если используется)

## Развертывание

### Вариант 1: Отдельный фронтенд сервер (Nginx)

1. Собрать проект: `npm run build`
2. Скопировать `dist/` на сервер
3. Настроить Nginx для раздачи статических файлов и проксирования API

### Вариант 2: Интеграция с Spring Boot

1. Собрать проект: `npm run build`
2. Скопировать содержимое `dist/` в `backend/src/main/resources/static/`
3. Spring Boot будет раздавать фронтенд статически

## Следующие шаги

1. Создать компоненты для Jobs, Cluster, Dashboard
2. Настроить аутентификацию
3. Добавить WebSocket для real-time обновлений
4. Реализовать UI компоненты на Material-UI
