# Capacitor Android Support

Этот проект теперь поддерживает Capacitor для создания Android приложений.

## Установленные пакеты

- `@capacitor/core` - Основной пакет Capacitor
- `@capacitor/cli` - CLI для управления Capacitor
- `@capacitor/android` - Android платформа
- `cross-env` - Для работы с переменными окружения

## Структура проекта

- `android/` - Android проект
- `capacitor.config.ts` - Конфигурация Capacitor
- `vite.capacitor.config.ts` - Конфигурация Vite для Capacitor

## Доступные скрипты

- `npm run cap:build` - Собрать проект и синхронизировать с Capacitor
- `npm run cap:android` - Открыть Android Studio
- `npm run cap:run:android` - Запустить приложение на Android устройстве/эмуляторе
- `npm run cap:sync` - Синхронизировать веб-ресурсы с нативными платформами

## Как использовать

1. **Сборка для Android:**
   ```bash
   npm run cap:build
   ```

2. **Открыть Android Studio:**
   ```bash
   npm run cap:android
   ```

3. **Запустить на устройстве/эмуляторе:**
   ```bash
   npm run cap:run:android
   ```

## Требования

- Node.js
- Android Studio
- Android SDK
- Java Development Kit (JDK)

## Конфигурация

Основные настройки находятся в `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.example.planer',
  appName: 'planer',
  webDir: 'dist'
};
```

## Разработка

Для разработки используйте обычные команды Vite:

```bash
npm run dev
```

Для сборки используйте специальную конфигурацию Capacitor:

```bash
npm run cap:build
```

## Примечания

- Веб-ресурсы собираются в папку `dist/`
- Android проект находится в папке `android/`
- При изменении веб-кода необходимо выполнить `npm run cap:sync` для синхронизации




