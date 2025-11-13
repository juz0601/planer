# Worker Structure

This directory contains the Cloudflare Workers backend built with Hono framework.

## Structure

```
worker/
├── index.ts              # Main entry point, app initialization
├── types.ts              # TypeScript type definitions
├── routes/               # API route handlers
│   └── versions.ts       # Version management endpoints
└── middleware/           # Custom middleware
    └── index.ts          # Logger, request ID, auth middleware
```

## Key Features

- **Hono Framework**: Fast, lightweight web framework optimized for edge computing
- **TypeScript**: Full type safety across the application
- **Modular Routes**: Organized route structure for better maintainability
- **Middleware Support**: Custom middleware for logging, request tracking, and authentication
- **CORS**: Automatic CORS handling for all endpoints
- **Error Handling**: Centralized error handling with proper status codes

## Middleware

### Logger
Logs all incoming requests with method, URL, status code, and response time.

### Request ID
Adds a unique identifier to each request via `X-Request-ID` header for tracking and debugging.

### Auth (Template)
Template for Firebase JWT authentication (uncomment and implement when needed).

## Adding New Routes

1. Create a new file in `routes/` directory:

```typescript
// worker/routes/example.ts
import { Hono } from 'hono';
import type { Env } from '../types';

const example = new Hono<{ Bindings: Env }>();

example.get('/', async (c) => {
  return c.json({ message: 'Hello from example route' });
});

export default example;
```

2. Mount the route in `worker/index.ts`:

```typescript
import example from './routes/example';

// In the api section:
api.route('/example', example);
```

## Development

```bash
# Local development
npx wrangler dev

# Build
npm run build

# Deploy
npm run deploy
```

## Environment

Environment variables are configured in `wrangler.jsonc`:
- `DB`: D1 database binding
- `My_NAME`: Example environment variable

## API Documentation

See [API.md](../API.md) for detailed API documentation.



