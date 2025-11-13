import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  type ActionCodeSettings,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!result.user.emailVerified) {
        throw new Error('Please verify your email before signing in');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      
      // Send verification email immediately after signup
      await sendVerificationEmail();
      
      // Save registration info in localStorage before logout
      localStorage.setItem('registrationComplete', 'true');
      localStorage.setItem('registeredEmail', email);
      
      // Sign out user until they verify their email
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Clear any cached tokens
      localStorage.removeItem('firebaseToken');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Action code settings - redirect to your app after email verification
      const actionCodeSettings: ActionCodeSettings = {
        url: 'https://planer.m-k-mendykhan.workers.dev/',
        handleCodeInApp: true,
      };

      await sendEmailVerification(auth.currentUser, actionCodeSettings);
    } catch (error: any) {
      console.error('Send verification email error:', error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      // Get fresh token (with force refresh if needed)
      const token = await user.getIdToken(true);
      
      // Cache token in localStorage for API calls
      localStorage.setItem('firebaseToken', token);
      
      return token;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    sendVerificationEmail,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

