import type { Context, Next } from 'hono';

/**
 * Logger middleware - logs all requests
 */
export const logger = async (c: Context, next: Next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
};

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestId = async (c: Context, next: Next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.res.headers.set('X-Request-ID', requestId);
  await next();
};

/**
 * Example: Auth middleware for Firebase JWT validation
 * Uncomment and implement when Firebase Auth is configured
 */
/*
export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  
  try {
    // TODO: Validate Firebase JWT token here
    // const decodedToken = await verifyFirebaseToken(token);
    // c.set('user', decodedToken);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};
*/

