# FamilyTree — Frontend

> **Стек:** React 19 · TypeScript · Vite · TanStack Query v5 · Zustand · ReactFlow · Tailwind CSS v4  
> **Статус:** Production-ready  
> **Деплой:** Nginx в Docker-контейнере, порт 3000

---

## Содержание

1. [Обзор приложения](#1-обзор-приложения)
2. [Архитектура и стек](#2-архитектура-и-стек)
3. [Структура проекта](#3-структура-проекта)
4. [Страницы и маршруты](#4-страницы-и-маршруты)
5. [Управление состоянием](#5-управление-состоянием)
6. [API-клиент и кэширование](#6-api-клиент-и-кэширование)
7. [Визуализация дерева (TreePage)](#7-визуализация-дерева-treepage)
8. [Компоненты](#8-компоненты)
9. [Тестирование](#9-тестирование)
10. [Запуск локально](#10-запуск-локально)
11. [Сборка и деплой](#11-сборка-и-деплой)
12. [Переменные окружения](#12-переменные-окружения)

---

## 1. Обзор приложения

Веб-приложение для **совместного создания и визуализации семейных деревьев**. Позволяет:

- Регистрироваться, входить, верифицировать email, сбрасывать пароль
- Создавать несколько семейных деревьев и управлять ими
- Добавлять персон с биографическими данными, фото и медиафайлами
- Строить родственные связи (PARENT_CHILD, PARTNERSHIP) с интерактивной визуализацией
- Приглашать соавторов по email или ссылке с ролями OWNER / EDITOR / VIEWER
- Публиковать дерево по публичной ссылке (только чтение)
- Анализировать биографию с помощью YandexGPT AI
- Получать уведомления о действиях в деревьях
- Экспортировать граф в PNG или PDF

---

## 2. Архитектура и стек

### Технологии

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| React | 19 | UI-фреймворк |
| TypeScript | 5.9 | Статическая типизация |
| Vite | 7 | Сборщик и dev-сервер |
| TanStack Query | 5 | Серверное состояние, кэширование |
| Zustand | 5 | Клиентское состояние (auth) |
| React Router DOM | 6 | Маршрутизация |
| ReactFlow (`@xyflow/react`) | 12 | Интерактивный граф дерева |
| dagre | 0.8 | Автоматическая раскладка графа |
| Tailwind CSS | 4 | Утилитарные стили |
| Axios | 1 | HTTP-клиент |
| React Hook Form + Zod | 7 + 4 | Формы и валидация |
| lucide-react | 0.575 | Иконки |
| html-to-image + jsPDF | 1 + 4 | Экспорт в PNG/PDF |
| react-hot-toast | 2 | Toast-уведомления |
| Vitest | 4 | Unit-тестирование |

### Взаимодействие с бэкендом

```
Browser
  │
  ├── axios (treeApi)  ──→  tree-service  :8080  /api/*
  │     └── JWT Bearer token в каждом запросе
  │
  └── axios (authApi)  ──→  auth-service  :8081  /api/auth/*, /api/profile/*
        └── JWT Bearer token в каждом запросе
```

Оба экземпляра Axios настроены в [`src/api/axiosConfig.ts`](src/api/axiosConfig.ts):
- **Request interceptor** — добавляет `Authorization: Bearer <token>` из Zustand store
- **Response interceptor** — при 401 очищает auth-state и редиректит на `/login`

---

## 3. Структура проекта

```
FamilyTree-Frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   ├── axiosConfig.ts        # Axios instances + interceptors
│   │   ├── auth.ts               # Auth API (sign-up, sign-in, profile, ...)
│   │   └── trees.ts              # Trees/Persons/Relations/Media/AI API
│   ├── components/
│   │   ├── Layout.tsx            # Обёртка с Navbar для приватных маршрутов
│   │   ├── Navbar.tsx            # Верхняя навигация
│   │   ├── PrivateRoute.tsx      # Защита маршрутов (проверка JWT)
│   │   ├── TreeFiltersPanel.tsx  # Панель фильтров графа (сворачиваемая)
│   │   └── ui/
│   │       ├── Badge.tsx         # Бейдж роли (OWNER/EDITOR/VIEWER)
│   │       ├── Modal.tsx         # Модальное окно
│   │       ├── Spinner.tsx       # Индикатор загрузки
│   │       └── VoiceInputButton.tsx  # Кнопка голосового ввода
│   ├── hooks/
│   │   ├── useNotifications.ts   # Polling уведомлений (каждые 30 сек)
│   │   ├── usePageTitle.ts       # Динамический title страницы
│   │   └── useVoiceInput.ts      # Web Speech API hook
│   ├── pages/
│   │   ├── LandingPage.tsx       # Главная страница (публичная)
│   │   ├── LoginPage.tsx         # Вход
│   │   ├── RegisterPage.tsx      # Регистрация
│   │   ├── ConfirmEmailPage.tsx  # Подтверждение email
│   │   ├── ForgotPasswordPage.tsx # Запрос сброса пароля
│   │   ├── ResetPasswordPage.tsx  # Установка нового пароля
│   │   ├── DashboardPage.tsx     # Список деревьев пользователя
│   │   ├── TreePage.tsx          # Визуализация дерева (ReactFlow)
│   │   ├── PersonPage.tsx        # Карточка персоны (вкладки)
│   │   ├── ProfilePage.tsx       # Профиль пользователя
│   │   ├── NotificationsPage.tsx # Уведомления
│   │   ├── AcceptInvitePage.tsx  # Принятие приглашения по токену
│   │   └── PublicTreePage.tsx    # Публичный просмотр дерева
│   ├── store/
│   │   ├── authStore.ts          # Zustand: JWT + User, persist в localStorage
│   │   └── notificationStore.ts  # Zustand: список уведомлений
│   ├── types/
│   │   ├── index.ts              # Все TypeScript-интерфейсы
│   │   └── speech.d.ts           # Типы Web Speech API
│   ├── utils/
│   │   ├── formatDate.ts         # Форматирование дат
│   │   ├── jwtUtils.ts           # Декодирование JWT payload
│   │   └── roleUtils.ts          # Утилиты для ролей (canEdit, canView, ...)
│   ├── test/
│   │   └── setup.ts              # Vitest setup (jest-dom matchers)
│   ├── App.tsx                   # Корневой компонент, маршруты
│   ├── main.tsx                  # Точка входа
│   └── index.css                 # Глобальные стили (Tailwind directives)
├── Dockerfile                    # Multi-stage: build → nginx
├── nginx.conf                    # Nginx конфигурация (SPA fallback)
├── docker-compose.yml            # Локальный запуск в Docker
├── vite.config.ts                # Vite конфигурация
└── package.json
```

---

## 4. Страницы и маршруты

### Публичные маршруты

| Путь | Компонент | Описание |
|------|-----------|----------|
| `/` | `LandingPage` | Главная страница с описанием сервиса |
| `/login` | `LoginPage` | Форма входа |
| `/register` | `RegisterPage` | Форма регистрации |
| `/confirm-email` | `ConfirmEmailPage` | Верификация email по токену из URL |
| `/forgot-password` | `ForgotPasswordPage` | Запрос письма сброса пароля |
| `/reset-password` | `ResetPasswordPage` | Форма нового пароля (токен из URL) |
| `/invite/:token` | `AcceptInvitePage` | Принятие приглашения в дерево |
| `/public/:token` | `PublicTreePage` | Публичный просмотр дерева (только чтение) |

### Приватные маршруты (требуют JWT)

| Путь | Компонент | Описание |
|------|-----------|----------|
| `/dashboard` | `DashboardPage` | Список деревьев (вкладки: Все / Мои / Совместные) |
| `/trees/:treeId` | `TreePage` | Интерактивный граф дерева |
| `/trees/:treeId/persons/:personId` | `PersonPage` | Карточка персоны (5 вкладок) |
| `/profile` | `ProfilePage` | Профиль и смена пароля |
| `/notifications` | `NotificationsPage` | Уведомления (Все / Непрочитанные) |

### Защита маршрутов

[`PrivateRoute`](src/components/PrivateRoute.tsx) проверяет наличие токена в Zustand store. При отсутствии — редирект на `/login`.

---

## 5. Управление состоянием

### authStore (Zustand + persist)

Файл: [`src/store/authStore.ts`](src/store/authStore.ts)

```typescript
interface AuthState {
  user: User | null        // { id, email, firstName, lastName, emailVerified }
  token: string | null     // JWT-токен
  setAuth(user, token)     // Установить после успешного входа
  clearAuth()              // Очистить при выходе или 401
}
```

Состояние персистируется в `localStorage` под ключом `jwt_token`. При перезагрузке страницы токен восстанавливается автоматически.

### notificationStore (Zustand)

Файл: [`src/store/notificationStore.ts`](src/store/notificationStore.ts)

Хранит список уведомлений в памяти. Обновляется через polling каждые 30 секунд (хук [`useNotifications`](src/hooks/useNotifications.ts)).

### TanStack Query (серверное состояние)

Все данные с сервера управляются через TanStack Query v5:

```typescript
// Пример: список деревьев
const { data, isLoading } = useQuery({
  queryKey: ['trees'],
  queryFn: () => treesApi.getTrees(),
  staleTime: 30_000,   // данные свежие 30 сек
})

// Пример: мутация с инвалидацией кэша
const mutation = useMutation({
  mutationFn: (name) => treesApi.createTree(name),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trees'] }),
})
```

Ключевые `queryKey`:
- `['trees']` — список деревьев
- `['persons', treeId]` — персоны дерева
- `['person', treeId, personId]` — одна персона
- `['graph', treeId]` — граф (персоны + связи)
- `['members', treeId]` — участники дерева
- `['notifications']` — уведомления (polling 30 сек)
- `['media', treeId, personId]` — медиафайлы персоны
- `['comments', treeId, personId]` — комментарии персоны
- `['history', treeId, personId]` — история изменений персоны

---

## 6. API-клиент и кэширование

### Axios instances

Файл: [`src/api/axiosConfig.ts`](src/api/axiosConfig.ts)

```typescript
// tree-service (порт 8080)
export const treeApi = axios.create({ baseURL: '/api' })

// auth-service (порт 8081)
export const authApi = axios.create({ baseURL: '/auth-api' })
```

В production Nginx проксирует:
- `/api/*` → `tree-service:8080`
- `/auth-api/*` → `auth-service:8081`

### Публичные эндпоинты (без JWT)

Следующие пути не добавляют заголовок `Authorization`:
- `/api/auth/**` — регистрация, вход, верификация
- `/api/trees/public/**` — публичный просмотр дерева
- `/api/trees/invite/**` — принятие приглашения

### API-модули

**[`src/api/auth.ts`](src/api/auth.ts)** — аутентификация и профиль:
- `signUp`, `signIn`, `confirmEmail`, `forgotPassword`, `resetPassword`
- `getProfile`, `updateProfile`, `changePassword`, `deleteAccount`

**[`src/api/trees.ts`](src/api/trees.ts)** — деревья, персоны, связи, медиа, AI:
- `getTrees`, `createTree`, `updateTree`, `deleteTree`
- `getPersons`, `createPerson`, `getPerson`, `updatePerson`, `deletePerson`
- `addRelationship`, `deleteRelationship`, `getGraph`
- `uploadAvatar`, `getMedia`, `uploadMedia`, `downloadMedia`, `deleteMedia`
- `getComments`, `addComment`, `updateComment`, `deleteComment`
- `getPersonHistory`
- `getNotifications`, `markAsRead`, `markAllAsRead`
- `inviteMember`, `getInviteLink`, `acceptInvite`
- `generatePublicLink`, `revokePublicLink`, `getPublicTree`
- `extractFacts` — AI-анализ биографии

---

## 7. Визуализация дерева (TreePage)

Файл: [`src/pages/TreePage.tsx`](src/pages/TreePage.tsx)

### Архитектура графа

Граф строится на основе данных из `/api/trees/{treeId}/persons/graph` (массив `PersonDTO` со связями).

**Типы узлов:**
- `PersonNode` — карточка персоны (имя, даты, фото, пол)
- `CoupleNode` — невидимый промежуточный узел для пары (PARTNERSHIP)

**Паттерн CoupleNode:**
```
PersonA ──partner-right──→ CoupleNode ←──partner-left── PersonB
                               │
                          children-out
                               │
                               ▼
                           PersonC (ребёнок)
```

Это позволяет корректно отображать детей от конкретной пары.

### Раскладка (dagre)

Функция `getLayoutedElements()` использует библиотеку `dagre` для автоматического позиционирования узлов.

**Режимы:**
- **Вертикальный (TB)** — дерево сверху вниз (по умолчанию)
- **Горизонтальный (LR)** — дерево слева направо

**Гендерная раскладка в PARTNERSHIP:**
После dagre применяется пост-обработка: в паре мужчина всегда слева (TB) или сверху (LR), женщина — справа/снизу.

### Handles (точки подключения рёбер)

`PersonNode` имеет 4 направленных Handle:
- `parent-in` (target) — вход от родителя: Top (TB) / Left (LR)
- `children-out` (source) — выход к детям: Bottom (TB) / Right (LR)
- `partner-right` (source) — выход к CoupleNode: Right (TB) / Bottom (LR)
- `partner-left` (target) — вход от CoupleNode: Left (TB) / Top (LR)

### Фильтрация

Панель [`TreeFiltersPanel`](src/components/TreeFiltersPanel.tsx) позволяет фильтровать граф по:
- Полу (Мужской / Женский)
- Наличию дат жизни
- Поиску по имени

### Экспорт

- **PNG** — `html-to-image` захватывает `.react-flow__viewport`, скачивает файл
- **PDF** — `jsPDF` + `html-to-image`, автоматически выбирает ориентацию (portrait/landscape)

### Панель связей

Кнопка «Связи (N)» в правом нижнем углу открывает список всех связей дерева с возможностью удаления каждой.

### Валидация

При добавлении связи PARTNERSHIP проверяется, что оба участника имеют разный пол. Однополые партнёрства заблокированы с сообщением об ошибке.

---

## 8. Компоненты

### PersonPage (вкладки)

Файл: [`src/pages/PersonPage.tsx`](src/pages/PersonPage.tsx)

| Вкладка | Содержимое |
|---------|-----------|
| **Основное** | ФИО, даты, места, биография, аватар |
| **Медиа** | Загрузка/просмотр/скачивание файлов (до 50 шт., счётчик) |
| **Комментарии** | Добавление, редактирование, удаление комментариев |
| **История** | Лог изменений полей персоны (кто, когда, что изменил) |
| **AI-анализ** | Отправка биографии в YandexGPT, отображение дат/мест/профессий |

### DashboardPage (вкладки)

Файл: [`src/pages/DashboardPage.tsx`](src/pages/DashboardPage.tsx)

- Вкладки: **Все** / **Мои** / **Совместные**
- Сортировка: по дате создания (новые/старые) или по имени (А-Я/Я-А)
- Карточки деревьев с меню: переименовать, удалить, пригласить, публичная ссылка

### NotificationsPage (фильтры)

Файл: [`src/pages/NotificationsPage.tsx`](src/pages/NotificationsPage.tsx)

- Вкладки: **Все** / **Непрочитанные**
- Кнопки: «Прочитать все», удаление отдельных уведомлений

### VoiceInputButton

Файл: [`src/components/ui/VoiceInputButton.tsx`](src/components/ui/VoiceInputButton.tsx)

Кнопка голосового ввода на основе Web Speech API. Используется в форме редактирования биографии персоны. Поддерживает русский язык (`lang: 'ru-RU'`).

---

## 9. Тестирование

### Запуск тестов

```bash
npm run test          # Однократный запуск
npm run test:watch    # Watch-режим
npm run test:ui       # Vitest UI в браузере
```

### Покрытие

| Файл | Тесты |
|------|-------|
| `src/store/authStore.test.ts` | Zustand auth store: setAuth, clearAuth, persist |
| `src/utils/formatDate.test.ts` | Форматирование дат (null, ISO, частичные) |
| `src/utils/roleUtils.test.ts` | Утилиты ролей (canEdit, canView, isOwner) |
| `src/hooks/useVoiceInput.test.ts` | Web Speech API hook |
| `src/components/ui/VoiceInputButton.test.tsx` | Компонент кнопки голосового ввода |

### Конфигурация

Файл: [`vite.config.ts`](vite.config.ts) — Vitest настроен с `environment: 'jsdom'` и `setupFiles: ['src/test/setup.ts']`.

---

## 10. Запуск локально

### Требования

- Node.js 20+
- npm 10+
- Запущенные backend-сервисы (auth-service :8081, tree-service :8080)

### Установка и запуск

```bash
cd FamilyTree-Frontend
npm install
npm run dev
```

Приложение доступно на `http://localhost:5173`.

### Настройка прокси (vite.config.ts)

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8080',
    '/auth-api': {
      target: 'http://localhost:8081',
      rewrite: (path) => path.replace(/^\/auth-api/, '/api')
    }
  }
}
```

---

## 11. Сборка и деплой

### Сборка Docker-образа

```bash
cd FamilyTree-Frontend
docker build -t familytree-frontend .
```

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

### nginx.conf

Nginx настроен как:
1. **SPA fallback** — все пути возвращают `index.html` (для React Router)
2. **Reverse proxy** — `/api/*` → `tree-service:8080`, `/auth-api/*` → `auth-service:8081`
3. **Gzip** — сжатие статики

### CI/CD

GitHub Actions workflow автоматически:
1. Собирает Docker-образ при push в `main`
2. Деплоит на VM через SSH
3. Перезапускает контейнер

---

## 12. Переменные окружения

В production переменные передаются через Nginx proxy (не через `.env` файл фронтенда). Адреса API задаются в `nginx.conf`:

```nginx
location /api/ {
    proxy_pass http://tree-service:8080/api/;
}

location /auth-api/ {
    proxy_pass http://auth-service:8081/api/;
}
```

Для локальной разработки используется `vite.config.ts` proxy (см. раздел 10).
