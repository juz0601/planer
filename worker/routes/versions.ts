import { Hono } from 'hono';
import type { Env, AppVersion } from '../types';

// Create versions route
const versions = new Hono<{ Bindings: Env }>();

/**
 * Get all app versions
 */
versions.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM app_versions ORDER BY released_at DESC'
  ).all<AppVersion>();

  if (!result.success) {
    return c.json({
      error: 'Database query failed',
      details: result.error,
    }, 500);
  }

  return c.json({
    success: true,
    data: result.results || [],
    count: result.results?.length || 0,
    meta: result.meta,
  });
});

/**
 * Get latest app version
 */
versions.get('/latest', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM app_versions ORDER BY released_at DESC LIMIT 1'
  ).first<AppVersion>();

  if (!result) {
    return c.json({
      error: 'No versions found',
    }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * Get specific version by version string
 */
versions.get('/:version', async (c) => {
  const version = c.req.param('version');
  
  const result = await c.env.DB.prepare(
    'SELECT * FROM app_versions WHERE version = ?'
  )
    .bind(version)
    .first<AppVersion>();

  if (!result) {
    return c.json({
      error: 'Version not found',
      version,
    }, 404);
  }

  return c.json({
    success: true,
    data: result,
  });
});

export default versions;



