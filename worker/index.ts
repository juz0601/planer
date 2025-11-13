import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import versions from './routes/versions';
import { logger, requestId } from './middleware';

// Create Hono app with typed environment
const app = new Hono<{ Bindings: Env }>();

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
const api = new Hono<{ Bindings: Env }>();

// Mount version routes
api.route('/versions', versions);

/**
 * Legacy test endpoint
 */
api.get('/*', async (c) => {
  return c.json({
    name: c.env.My_NAME,
  });
});

// Mount API routes
app.route('/api', api);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
  }, 404);
});

export default app;
