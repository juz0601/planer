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

