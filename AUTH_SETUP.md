# Firebase Authentication Setup

## Что реализовано

Полная система авторизации через email и password с использованием Firebase и Hono:

### Backend (Worker)

1. **Firebase Auth Middleware** (`@hono/firebase-auth`)
   - Автоматическая проверка JWT токенов
   - Защита всех API роутов требующих авторизации
   - Конфигурация для проекта `planer-246d3`

2. **API Routes**
   - `POST /api/public/auth/health` - проверка работы auth service
   - `POST /api/public/auth/verify` - проверка валидности токена
   - `/api/*` - защищенные роуты (требуют валидный Firebase JWT токен)

3. **Структура**
   - Public routes: `/api/public/*` - без авторизации
   - Protected routes: `/api/*` - требуют Firebase Auth

### Frontend

1. **Auth Context** (`src/context/AuthContext.tsx`)
   - `signup(email, password, displayName)` - регистрация
   - `login(email, password)` - вход
   - `logout()` - выход
   - `getIdToken()` - получение актуального JWT токена
   - Автоматическое сохранение токена в localStorage

2. **UI Компоненты**
   - `AuthPage` - страница авторизации с табами
   - `LoginForm` - форма входа
   - `SignupForm` - форма регистрации
   - `EmailVerification` - страница верификации email
   - `ProtectedRoute` - компонент для защиты роутов (проверяет auth + email verification)

3. **API Client** (`src/utils/api.ts`)
   - `apiRequest()` - автоматически добавляет Bearer токен
   - `publicApiRequest()` - для публичных запросов

## Настройка Firebase Console

### 1. Включить Email/Password авторизацию

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект `planer-246d3`
3. Перейдите в **Authentication** → **Sign-in method**
4. Найдите **Email/Password** и нажмите **Enable**
5. Включите **Email/Password** (первая опция)
6. Сохраните изменения

### 2. Настроить Authorized Domains

⚠️ **Важно для production:**

1. В Firebase Console перейдите в **Authentication** → **Settings** → **Authorized domains**
2. Добавьте ваш production домен: `planer.m-k-mendykhan.workers.dev`
3. Нажмите **Add domain**

Это необходимо для корректной работы редиректа после подтверждения email.

### 3. (Опционально) Настроить дополнительные параметры

- **Password Policy** - требования к паролям (по умолчанию минимум 6 символов)
- **Email Templates** - кастомизация писем верификации

## Как использовать

### Регистрация нового пользователя

```typescript
import { useAuth } from './context/AuthContext';

const { signup } = useAuth();

// Автоматически отправляет email с подтверждением
await signup('user@example.com', 'password123', 'John Doe');

// После регистрации пользователь увидит страницу верификации email
// Доступ к приложению будет только после подтверждения email
```

### Вход

```typescript
import { useAuth } from './context/AuthContext';

const { login } = useAuth();

await login('user@example.com', 'password123');

// Если email не подтвержден, пользователь увидит страницу верификации
// Если email подтвержден, откроется основное приложение
```

### Выход

```typescript
import { useAuth } from './context/AuthContext';

const { logout } = useAuth();

await logout();
```

### Защищенные API запросы

```typescript
import { apiRequest } from './utils/api';

// Автоматически добавляет Bearer токен из localStorage
const data = await apiRequest('/versions');
```

### Публичные API запросы

```typescript
import { publicApiRequest } from './utils/api';

// Без токена
const health = await publicApiRequest('/auth/health');
```

## Безопасность

✅ **Реализовано:**
- **Email верификация обязательна** - пользователи с неподтвержденным email не могут войти в приложение
- JWT токены проверяются на backend через Firebase Admin SDK
- Токены хранятся в localStorage
- Автоматическое обновление токена через `getIdToken(true)`
- Все защищенные роуты требуют валидный токен
- Пользователи без авторизации не могут получить доступ к приложению

⚠️ **Важно:**
- При регистрации автоматически отправляется письмо с подтверждением email
- Без подтверждения email доступ к приложению **заблокирован**
- Токены обновляются автоматически при каждом запросе
- Firebase токены имеют срок действия 1 час
- При истечении токена пользователь будет перенаправлен на страницу входа

## Структура файлов

```
worker/
  ├── index.ts                 # Настройка Firebase middleware
  ├── types.ts                 # Типы с поддержкой VerifyFirebaseAuthEnv
  ├── middleware/index.ts      # Export Firebase Auth utilities
  └── routes/
      └── auth.ts              # Public auth routes

src/
  ├── config/
  │   └── firebase.ts          # Firebase инициализация
  ├── context/
  │   └── AuthContext.tsx      # Auth context и hooks
  ├── utils/
  │   └── api.ts               # API client с auto-auth
  └── components/
      ├── ProtectedRoute.tsx   # HOC для защиты роутов
      └── Auth/
          ├── AuthPage.tsx     # Главная страница auth
          ├── LoginForm.tsx    # Форма входа
          └── SignupForm.tsx   # Форма регистрации
```

## Тестирование

1. Запустите dev сервер: `npm run dev`
2. Откройте приложение - должна появиться страница авторизации
3. Зарегистрируйте нового пользователя
4. **Важно:** После регистрации появится страница верификации email
5. Проверьте email - должно прийти письмо от Firebase
6. Кликните на ссылку в письме для подтверждения
7. **Автоматический редирект:** После клика на ссылку вы будете перенаправлены на https://planer.m-k-mendykhan.workers.dev/
8. Email автоматически подтвердится и вы получите доступ к приложению
9. Проверьте localStorage - там должен быть `firebase_token`
10. Попробуйте выйти через drawer menu
11. Попробуйте снова войти с теми же credentials

**Альтернативный способ:**
- Можно также вернуться на страницу верификации вручную и нажать "Я подтвердил email"

## Troubleshooting

**Проблема:** "Firebase: Error (auth/email-already-in-use)"
- **Решение:** Этот email уже зарегистрирован. Используйте другой или войдите

**Проблема:** "Firebase: Error (auth/wrong-password)"
- **Решение:** Неверный пароль. Проверьте правильность ввода

**Проблема:** "Error: Unauthorized" при API запросах
- **Решение:** Проверьте наличие токена в localStorage и его валидность
- Попробуйте выйти и войти снова

**Проблема:** Firebase Auth не работает локально
- **Решение:** Добавьте `localhost` в Authorized Domains в Firebase Console

