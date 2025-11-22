import type { MiddlewareHandler } from 'hono';
import {
  type VerifyFirebaseAuthConfig,
  verifyFirebaseAuth,
  getFirebaseToken,
} from '@hono/firebase-auth';
import type { Env, Variables } from '../types';

// Firebase configuration
const firebaseConfig: VerifyFirebaseAuthConfig = {
  projectId: 'planer-246d3',
};

/**
 * Middleware to verify Firebase authentication
 * Checks if user has valid JWT token and verified email
 * Creates user in database if not exists
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  // Apply Firebase auth verification
  const firebaseAuthHandler = verifyFirebaseAuth(firebaseConfig);
  
  try {
    // Verify the Firebase token first
    await firebaseAuthHandler(c, async () => {
      // Get the decoded Firebase token after verification
      const token = getFirebaseToken(c);
      
      if (!token) {
        throw new Error('No token found');
      }
      
      // Check if email is verified
      if (!token.email_verified || token.email_verified !== true) {
        throw new Error('Email not verified');
      }
      
      // Ensure user exists in database
      await ensureUserExists(c, token);
      
      // Set user info in context for downstream handlers
      c.set('user', token);
    });
    
    // Continue to next handler
    await next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    // Handle specific error messages
    if (error.message === 'Email not verified') {
      return c.json(
        {
          error: 'Email not verified',
          message: 'Please verify your email address before accessing the application',
        },
        403
      );
    }
    
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      },
      401
    );
  }
};

/**
 * Ensures user exists in the database, creates if not
 */
async function ensureUserExists(c: any, token: any): Promise<void> {
  const db = c.env.DB;
  
  if (!db) {
    console.error('Database not available');
    return;
  }
  
  try {
    // Check if user exists
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE id = ?')
      .bind(token.uid)
      .first();
    
    if (!existingUser) {
      // Create user
      await db
        .prepare(`
          INSERT INTO users (id, email, display_name, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `)
        .bind(
          token.uid,
          token.email || '',
          token.name || token.email?.split('@')[0] || ''
        )
        .run();
      
      console.log('Created new user:', token.uid);
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    // Don't throw - allow request to continue even if user creation fails
  }
}

/**
 * Optional middleware that allows both authenticated and unauthenticated requests
 * Sets user info if token is present and valid
 */
export const optionalAuthMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const firebaseAuthHandler = verifyFirebaseAuth(firebaseConfig);
      await firebaseAuthHandler(c, async () => {
        const token = getFirebaseToken(c);
        if (token) {
          c.set('user', token);
        }
      });
    } catch (error) {
      // Ignore auth errors for optional auth
      console.log('Optional auth failed, continuing as unauthenticated');
    }
  }
  
  await next();
};

