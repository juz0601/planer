import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Variables } from './types';
import versions from './routes/versions';
import tasks from './routes/tasks';
import tags from './routes/tags';
import { logger, requestId, authMiddleware } from './middleware';

// Create Hono app with typed environment
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('/*', logger);
app.use('/*', requestId);

// CORS middleware
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Global error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message || 'Unknown error',
  }, 500);
});

// API Routes
const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Public routes (no auth required)
const publicApi = new Hono<{ Bindings: Env; Variables: Variables }>();
publicApi.route('/versions', versions);

/**
 * Legacy test endpoint - public
 */
publicApi.get('/test', async (c) => {
  return c.json({
    name: c.env.My_NAME,
    message: 'Public endpoint - no auth required',
  });
});

// Protected routes (auth required)
const protectedApi = new Hono<{ Bindings: Env; Variables: Variables }>();
protectedApi.use('/*', authMiddleware);

/**
 * Protected test endpoint - requires authentication
 */
protectedApi.get('/profile', async (c) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }
  
  return c.json({
    message: 'This is a protected endpoint',
    user: {
      uid: user.uid,
      email: user.email,
      email_verified: user.email_verified,
    },
  });
});

// Register protected routes
protectedApi.route('/tasks', tasks);
protectedApi.route('/tags', tags);

// Mount all API routes
api.route('/', publicApi);
api.route('/', protectedApi);

// Mount API routes
app.route('/api', api);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
  }, 404);
});

export default app;
