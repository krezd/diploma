# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект

Веб-интерфейс для управления HPC-кластером на базе SLURM. Предоставляет управление пользователями, мониторинг заданий/узлов кластера и файловое хранилище.

## Команды

### Backend (Spring Boot, Java 21, Maven)

```bash
cd backend

# Сборка
./mvnw clean package

# Запуск локально
./mvnw spring-boot:run

# Тесты
./mvnw test

# Docker (backend + PostgreSQL)
docker-compose up
docker-compose down
```

### Frontend (React + TypeScript + Vite)

```bash
cd frontend

npm install          # Установка зависимостей
npm run dev          # Dev-сервер на порту 3000
npm run build        # Сборка в dist/
npm run lint         # Проверка ESLint
```

## Архитектура

### Схема взаимодействия

```
React (порт 3000) → Spring Boot (порт 8080) → slurmrestd (порт 6820)
                                             → PostgreSQL
                                             → Linux (useradd/usermod)
```

Vite проксирует `/api` → `http://localhost:8080` в dev-режиме.

### Backend — пакеты (`backend/src/main/java/ru/krezd/diploma/`)

| Пакет | Назначение |
|-------|-----------|
| `controller/` | REST-эндпоинты: Auth, Jobs, Nodes, Files, SlurmDiagnostic |
| `service/` | Бизнес-логика: UserService, JobsService, NodesService, SlurmJwtService, LinuxUserService, FilesService |
| `security/` | JWT-фильтры, SecurityConfig, SlurmAuthInterceptor |
| `generator/` | SlurmJwtGenerator — генерация JWT для slurmrestd |
| `interceptor/` | SlurmAuthInterceptor — добавляет SLURM JWT к запросам |
| `entity/` | User, RefreshToken (JPA-сущности) |
| `dto/slurm/` | DTO для ответов slurmrestd (job, node, meta) |
| `repository/` | Spring Data JPA репозитории |

### Двойная аутентификация

1. **Application JWT** — для Frontend → Backend (`JwtService`, алгоритм HMAC256, TTL настраивается через `jwt.accessTtl`)
2. **Refresh Token** — хранится в БД, используется для обновления access-токена
3. **SLURM JWT** — для Backend → slurmrestd (`SlurmJwtService`, кэшируется, обновляется за 2 минуты до истечения, ключ из `/var/spool/slurm/ctld/jwt_hs256.key`)

### Регистрация пользователя

При регистрации одновременно создаются: пользователь в БД + Linux-пользователь (`useradd`) + директория воркспейса (`/shared/workspace/diploma-app/{username}/`). Роли определяют группу: `REGULAR` → `slurm-user`, `ADMIN` → `slurm`.

### Frontend (`frontend/src/`)

| Папка | Назначение |
|-------|-----------|
| `services/api/client.ts` | Axios-клиент: JWT-инъекция, обработка 401/403/404/500 |
| `services/api/endpoints.ts` | Константы всех API-маршрутов |
| `types/` | TypeScript-интерфейсы |
| `stores/` | Zustand-стейт |
| `pages/` | Страницы (React Router) |
| `components/` | UI-компоненты (Material-UI) |

## Конфигурация

### Ключевые свойства (`application.properties`)

```properties
# SLURM REST API
slurm.rest.address=http://localhost:6820/slurm/v0.0.40/
slurm.jwt.key-path=/var/spool/slurm/ctld/jwt_hs256.key
slurm.token.lifetime=1800

# Группы SLURM
slurm.group.user=slurm-user
slurm.group.admin=slurm

# Рабочая директория
root.path=/shared/workspace/diploma-app/

# JWT
jwt.secret=secret
jwt.accessTtl=6000
jwt.refreshTtl=12000
```

Для Docker используется `application-docker.properties` (профиль `docker`).

## API-эндпоинты

| Метод | Путь | Роль |
|-------|------|------|
| POST | `/api/auth/login` | — |
| POST | `/api/auth/register` | — |
| POST | `/api/auth/refresh` | — |
| POST | `/api/auth/logout` | — |
| GET | `/api/slurm/jobs` | ADMIN |
| GET | `/api/slurm/user/jobs` | Авторизован |
| GET | `/api/slurm/job/{jobId}` | Авторизован |
| POST | `/api/slurm/job/submit` | Авторизован |
| DELETE | `/api/slurm/job/{jobId}` | Авторизован (своя) / ADMIN |
| POST | `/api/slurm/job/{jobId}` | ADMIN |
| GET | `/api/slurm/jobs/history` | ADMIN |
| GET | `/api/slurm/user/jobs/history` | Авторизован |
| GET | `/api/slurm/job/{jobId}/history` | Авторизован |
| GET | `/api/slurm/jobs/usage` | ADMIN |
| GET | `/api/slurm/user/jobs/usage` | Авторизован |
| GET | `/api/slurm/nodes` | Авторизован |
| GET | `/api/slurm/node/{nodeName}` | Авторизован |
| DELETE | `/api/slurm/node/{nodeName}` | ADMIN |

## RestTemplate vs RestClient

В проекте используются оба HTTP-клиента:
- `RestTemplate` с бином `slurmRestTemplate` (через `RestTemplateConfig`) — имеет `SlurmAuthInterceptor` для автоматической подстановки SLURM JWT
- `RestClient` — для остальных HTTP-запросов

При добавлении новых SLURM-запросов использовать `@Qualifier("slurmRestTemplate")`.

## База данных

PostgreSQL, DDL-auto: `update`. Сущности: `users` (id, username, password, name, role, created_at, updated_at) и `refresh_tokens` (id, token, user_id, expires_at, is_alive, updated_at).