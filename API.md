# API Documentation - App Versions

API для управления версиями приложения с использованием Cloudflare Workers, Hono framework и Cloudflare D1.

## Base URL
```
http://localhost:8787 (dev)
https://your-worker.workers.dev (production)
```

## Endpoints

### 1. Get All Versions
Получить список всех версий приложения, отсортированных по дате релиза (новые первыми).

**Endpoint:** `GET /api/versions`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "version": "1.1.0",
      "description": "New features added",
      "released_at": "2025-11-09 14:42:00",
      "created_at": "2025-11-09 14:42:00",
      "updated_at": "2025-11-09 14:42:00"
    },
    {
      "id": 2,
      "version": "1.0.1",
      "description": "Bug fixes and improvements",
      "released_at": "2025-11-09 14:42:00",
      "created_at": "2025-11-09 14:42:00",
      "updated_at": "2025-11-09 14:42:00"
    }
  ],
  "count": 3,
  "meta": {
    "duration": 0.123,
    "rows_read": 3,
    "rows_written": 0
  }
}
```

### 2. Get Latest Version
Получить последнюю версию приложения.

**Endpoint:** `GET /api/versions/latest`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "version": "1.1.0",
    "description": "New features added",
    "released_at": "2025-11-09 14:42:00",
    "created_at": "2025-11-09 14:42:00",
    "updated_at": "2025-11-09 14:42:00"
  }
}
```

### 3. Get Specific Version
Получить информацию о конкретной версии по номеру версии.

**Endpoint:** `GET /api/versions/{version}`

**Example:** `GET /api/versions/1.0.0`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "version": "1.0.0",
    "description": "Initial release",
    "released_at": "2025-11-09 14:42:00",
    "created_at": "2025-11-09 14:42:00",
    "updated_at": "2025-11-09 14:42:00"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Version not found",
  "version": "2.0.0"
}
```

## Error Responses

### 404 Not Found
```json
{
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Detailed error message"
}
```

## CORS
Все эндпоинты поддерживают CORS с использованием middleware Hono:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Features

### Hono Framework
API использует [Hono](https://hono.dev/) - легкий и быстрый web-framework для edge computing:
- ✅ Автоматическая обработка CORS через middleware
- ✅ Централизованная обработка ошибок
- ✅ Типобезопасный routing с TypeScript
- ✅ Модульная структура роутов
- ✅ Простая интеграция с Cloudflare Workers

## Testing

### Using curl

```bash
# Get all versions
curl http://localhost:8787/api/versions

# Get latest version
curl http://localhost:8787/api/versions/latest

# Get specific version
curl http://localhost:8787/api/versions/1.0.0
```

### Using JavaScript (fetch)

```javascript
// Get all versions
const versions = await fetch('http://localhost:8787/api/versions')
  .then(res => res.json());
console.log(versions);

// Get latest version
const latest = await fetch('http://localhost:8787/api/versions/latest')
  .then(res => res.json());
console.log(latest);

// Get specific version
const v1 = await fetch('http://localhost:8787/api/versions/1.0.0')
  .then(res => res.json());
console.log(v1);
```

## Development

### Start local server
```bash
npm run dev
```

### Apply migrations
```bash
# Local
npx wrangler d1 migrations apply planer-db --local

# Remote
npx wrangler d1 migrations apply planer-db --remote
```

### Deploy
```bash
npm run deploy
```

