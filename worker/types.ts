// D1 Database types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// App version interface
export interface AppVersion {
  id: number;
  version: string;
  description: string | null;
  released_at: string;
  created_at: string;
  updated_at: string;
}

// Environment bindings
export interface Env {
  DB: D1Database;
  My_NAME: string;
  PUBLIC_JWK_CACHE_KEY: string;
  PUBLIC_JWK_CACHE_KV: KVNamespace;
}

// Firebase user token interface (from JWT claims)
// This matches the structure returned by getFirebaseToken()
export interface FirebaseUser {
  uid: string;
  email?: string;
  email_verified?: boolean;
  auth_time?: number;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

// Hono context variables
export interface Variables {
  user?: FirebaseUser;
  requestId?: string;
}

