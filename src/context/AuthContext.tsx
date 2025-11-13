import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Store token in localStorage when user logs in
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem('firebase_token', token);
      } else {
        localStorage.removeItem('firebase_token');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    // Configure action code settings for email verification
    const actionCodeSettings = {
      url: 'https://planer.m-k-mendykhan.workers.dev/',
      handleCodeInApp: true,
    };
    
    // Send email verification with redirect URL
    await sendEmailVerification(result.user, actionCodeSettings);
    
    // Get and store token (but user won't be able to access app until verified)
    const token = await result.user.getIdToken();
    localStorage.setItem('firebase_token', token);
  };

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Get and store token
    const token = await result.user.getIdToken();
    localStorage.setItem('firebase_token', token);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('firebase_token');
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      // Force refresh to ensure token is not expired
      const token = await user.getIdToken(true);
      localStorage.setItem('firebase_token', token);
      return token;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Configure action code settings for email verification
    const actionCodeSettings = {
      url: 'https://planer.m-k-mendykhan.workers.dev/',
      handleCodeInApp: true,
    };
    
    await sendEmailVerification(user, actionCodeSettings);
  };

  const reloadUser = async () => {
    if (user) {
      await user.reload();
      setUser(auth.currentUser);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signup,
    login,
    logout,
    getIdToken,
    sendVerificationEmail,
    reloadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

