/**
 * API utility functions with Firebase Auth integration
 */

import { auth } from '../config/firebase';

/**
 * Safely stringify an object, handling circular references
 */
const safeStringify = (obj: any, maxDepth: number = 3, currentDepth: number = 0, visited: WeakSet<object> = new WeakSet()): string => {
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }
  
  if (obj === null || obj === undefined) {
    return String(obj);
  }
  
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  // Check for circular references
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }
  
  // Add to visited set
  visited.add(obj);
  
  try {
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        visited.delete(obj);
        return '[]';
      }
      const items = obj.slice(0, 5).map(item => safeStringify(item, maxDepth, currentDepth + 1, visited));
      visited.delete(obj);
      return `[${items.join(', ')}${obj.length > 5 ? ', ...' : ''}]`;
    }
    
    const keys = Object.keys(obj).slice(0, 10);
    const pairs = keys.map(key => {
      try {
        const value = safeStringify(obj[key], maxDepth, currentDepth + 1, visited);
        return `${key}: ${value}`;
      } catch {
        return `${key}: [Error serializing]`;
      }
    });
    visited.delete(obj);
    return `{${pairs.join(', ')}${Object.keys(obj).length > 10 ? ', ...' : ''}}`;
  } catch (error) {
    visited.delete(obj);
    return '[Object]';
  }
};

/**
 * Safely log an object to console, handling circular references
 */
const safeLog = (label: string, obj: any): void => {
  try {
    if (obj === null || obj === undefined) {
      console.error(label, obj);
      return;
    }
    
    if (typeof obj !== 'object') {
      console.error(label, obj);
      return;
    }
    
    // Try JSON.stringify first with a replacer to handle circular refs
    try {
      const seen = new WeakSet();
      const str = JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
      
      if (str && str.length < 1000) {
        // Only parse if string is not too long
        try {
          console.error(label, JSON.parse(str));
        } catch {
          console.error(label, str);
        }
      } else {
        // If too long, just log the string representation
        console.error(label, str ? str.substring(0, 500) + '...' : '[Too large to display]');
      }
    } catch {
      // If JSON.stringify fails, use safe stringify (but limit output)
      const str = safeStringify(obj, 2);
      console.error(label, str.length > 500 ? str.substring(0, 500) + '...' : str);
    }
  } catch (error) {
    // Last resort - just log the error message
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(label, '[Error logging object]', errorMsg);
  }
};

/**
 * Get the Firebase auth token from localStorage or refresh it
 */
const getAuthToken = async (): Promise<string | null> => {
  // Try to get cached token first
  const cachedToken = localStorage.getItem('firebaseToken');
  
  if (cachedToken && auth.currentUser) {
    // Check if token is still valid (not expired)
    try {
      // Try to get fresh token (Firebase will return cached if still valid)
      const freshToken = await auth.currentUser.getIdToken(false);
      if (freshToken !== cachedToken) {
        localStorage.setItem('firebaseToken', freshToken);
      }
      return freshToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Token might be expired, try to force refresh
      if (auth.currentUser) {
        try {
          const newToken = await auth.currentUser.getIdToken(true);
          localStorage.setItem('firebaseToken', newToken);
          return newToken;
        } catch (refreshError) {
          console.error('Error force refreshing token:', refreshError);
          localStorage.removeItem('firebaseToken');
          return null;
        }
      }
      return null;
    }
  }
  
  // If no cached token but user is logged in, get fresh token
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', token);
      return token;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Make an authenticated API request with automatic token refresh
 * @param endpoint - API endpoint (e.g., '/api/profile')
 * @param options - Fetch options
 */
export const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  let token = await getAuthToken();

  if (!token) {
    // Clear any stale token
    localStorage.removeItem('firebaseToken');
    throw new Error('No authentication token found. Please sign in again.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  let response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // If unauthorized, try to refresh token once
  if (response.status === 401 && auth.currentUser) {
    try {
      // Force refresh token
      const newToken = await auth.currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', newToken);
      
      // Retry request with new token
      const retryHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        ...options.headers,
      };
      
      response = await fetch(endpoint, {
        ...options,
        headers: retryHeaders,
      });
      
      // If still unauthorized after refresh, token is truly invalid
      if (response.status === 401) {
        localStorage.removeItem('firebaseToken');
        // Dispatch custom event for auth expiration
        window.dispatchEvent(new CustomEvent('auth-expired'));
        throw new Error('Authentication expired. Please sign in again.');
      }
    } catch (error: any) {
      // If refresh failed, clear token and throw error
      localStorage.removeItem('firebaseToken');
      window.dispatchEvent(new CustomEvent('auth-expired'));
      
      if (error.message && error.message.includes('Authentication expired')) {
        throw error;
      }
      throw new Error('Authentication expired. Please sign in again.');
    }
  } else if (response.status === 401) {
    // No user logged in
    localStorage.removeItem('firebaseToken');
    window.dispatchEvent(new CustomEvent('auth-expired'));
    throw new Error('Authentication expired. Please sign in again.');
  }

  return response;
};

/**
 * Make a public API request (no auth required)
 * @param endpoint - API endpoint
 * @param options - Fetch options
 */
export const publicFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(endpoint, {
    ...options,
    headers,
  });
};

/**
 * Example: Get user profile (protected endpoint)
 */
export const getUserProfile = async () => {
  const response = await authenticatedFetch('/api/profile');
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  return response.json();
};

/**
 * Example: Get app versions (public endpoint)
 */
export const getAppVersions = async () => {
  const response = await publicFetch('/api/versions');
  
  if (!response.ok) {
    throw new Error('Failed to fetch app versions');
  }
  
  return response.json();
};

// ============================================================
// TASKS API
// ============================================================

import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, ApiResponse, TaskHistory } from '../types';

/**
 * Get all tasks with optional filters
 */
export const getTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
  }
  
  const endpoint = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
  
  let response: Response;
  try {
    response = await authenticatedFetch(endpoint);
  } catch (error: any) {
    // If authenticatedFetch throws (e.g., auth error), re-throw it
    console.error('Error in authenticatedFetch:', error);
    throw error;
  }
  
  // Read response body once
  let responseText: string;
  try {
    responseText = await response.text();
  } catch (readError: any) {
    console.error('Failed to read response:', readError);
    throw new Error(`Failed to read response: ${response.status} ${response.statusText || 'Unknown error'}`);
  }
  
  if (!response.ok) {
    let errorMessage = 'Failed to fetch tasks';
    let errorData: any = null;
    
    try {
      if (responseText) {
        try {
          errorData = JSON.parse(responseText);
          // Safely extract error message
          if (errorData && typeof errorData === 'object') {
            const msg = errorData.message || errorData.error;
            if (msg && typeof msg === 'string') {
              errorMessage = msg.length > 200 ? msg.substring(0, 200) : msg;
            } else {
              errorMessage = 'Internal Server Error';
            }
          }
        } catch {
          // If not JSON, use text as error message (but limit length to avoid recursion)
          errorMessage = responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText;
        }
      } else {
        errorMessage = `${response.status} ${response.statusText || 'Unknown error'}`;
      }
      
      // Safe logging to avoid stack overflow from circular references
      // Only log if errorData is not null and is an object
      if (errorData !== null && typeof errorData === 'object') {
        try {
          safeLog('API error response:', errorData);
        } catch {
          // If safeLog fails, just log status
          console.error('API error - Status:', response.status);
        }
      } else {
        console.error('API error - Status:', response.status, 'Message:', errorMessage);
      }
    } catch (parseError) {
      // If everything fails, use simple error message
      errorMessage = `Server error (${response.status})`;
      try {
        const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('Failed to parse error response:', parseErrorMsg);
      } catch {
        console.error('Failed to parse error response');
      }
    }
    
    // Create simple error with guaranteed simple string message
    // Ensure errorMessage is always a simple string
    let finalErrorMessage: string;
    try {
      finalErrorMessage = typeof errorMessage === 'string' 
        ? errorMessage.substring(0, 500) 
        : 'Failed to fetch tasks';
    } catch {
      finalErrorMessage = 'Failed to fetch tasks';
    }
    
    const error = new Error(finalErrorMessage);
    error.name = 'APIError';
    throw error;
  }
  
  // Parse successful response
  try {
    if (!responseText) {
      throw new Error('Empty response from server');
    }
    
    let data: ApiResponse<Task[]>;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Failed to parse JSON response: ${parseErrorMsg.substring(0, 100)}`);
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }
    
    if (!data.success) {
      // Safely extract error message
      let errorMsg = 'Failed to fetch tasks';
      if (data.error && typeof data.error === 'string') {
        errorMsg = data.error.substring(0, 200);
      } else if (data.message && typeof data.message === 'string') {
        errorMsg = data.message.substring(0, 200);
      }
      throw new Error(errorMsg);
    }
    
    // Safely return data, ensuring it's an array
    if (Array.isArray(data.data)) {
      return data.data;
    } else if (data.data === null || data.data === undefined) {
      return [];
    } else {
      // If data is not an array, log warning and return empty array
      console.warn('API returned non-array data, returning empty array');
      return [];
    }
  } catch (error: any) {
    // If it's already our APIError, re-throw it
    if (error.name === 'APIError') {
      throw error;
    }
    
    // Safe error logging
    let errorMsg = 'Unknown error';
    try {
      errorMsg = error?.message || String(error) || 'Unknown error';
      if (errorMsg.length > 200) {
        errorMsg = errorMsg.substring(0, 200);
      }
    } catch {
      errorMsg = 'Failed to parse response';
    }
    
    console.error('Error parsing response:', errorMsg);
    
    // Create simple error message
    const parseError = new Error(`Failed to parse tasks response: ${errorMsg}`);
    parseError.name = 'ParseError';
    throw parseError;
  }
};

/**
 * Get a single task by ID
 */
export const getTaskById = async (taskId: string): Promise<Task> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}`);
  
  const data: ApiResponse<Task> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch task');
  }
  
  if (!data.data) throw new Error('Task not found');
  return data.data;
};

/**
 * Create a new task
 */
export const createTask = async (taskData: CreateTaskDTO): Promise<Task> => {
  const response = await authenticatedFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
  
  const data: ApiResponse<Task> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to create task');
  }
  
  if (!data.data) throw new Error('Failed to create task');
  return data.data;
};

/**
 * Update a task
 */
export const updateTask = async (taskId: string, updates: UpdateTaskDTO): Promise<Task> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  
  const data: ApiResponse<Task> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to update task');
  }
  
  if (!data.data) throw new Error('Failed to update task');
  return data.data;
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
};

/**
 * Archive a task
 */
export const archiveTask = async (taskId: string): Promise<void> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/archive`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to archive task');
  }
};

/**
 * Duplicate a task
 */
export const duplicateTask = async (taskId: string): Promise<Task> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/duplicate`, {
    method: 'POST',
  });
  
  const data: ApiResponse<Task> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to duplicate task');
  }
  
  if (!data.data) throw new Error('Failed to duplicate task');
  return data.data;
};

/**
 * Get task history
 */
export const getTaskHistory = async (taskId: string): Promise<TaskHistory[]> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/history`);
  
  const data: ApiResponse<TaskHistory[]> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch task history');
  }
  
  return data.data || [];
};

// ============================================================
// RECURRENCE API
// ============================================================

import type { RecurrenceRule } from '../types';

/**
 * Create recurrence rule for a task
 */
export const createRecurrenceRule = async (
  taskId: string,
  rule: Omit<RecurrenceRule, 'id' | 'created_at'>
): Promise<RecurrenceRule> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/recurrence`, {
    method: 'POST',
    body: JSON.stringify(rule),
  });
  
  const data: ApiResponse<RecurrenceRule> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to create recurrence rule');
  }
  
  if (!data.data) throw new Error('Failed to create recurrence rule');
  return data.data;
};

/**
 * Get recurrence rule for a task
 */
export const getRecurrenceRule = async (taskId: string): Promise<RecurrenceRule | null> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/recurrence`);
  
  const data: ApiResponse<RecurrenceRule> = await response.json();
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(data.message || data.error || 'Failed to fetch recurrence rule');
  }
  
  return data.data || null;
};

/**
 * Update recurrence rule for a task
 */
export const updateRecurrenceRule = async (
  taskId: string,
  updates: Partial<Omit<RecurrenceRule, 'id' | 'created_at' | 'task_id'>>
): Promise<RecurrenceRule> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/recurrence`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  
  const data: ApiResponse<RecurrenceRule> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to update recurrence rule');
  }
  
  if (!data.data) throw new Error('Failed to update recurrence rule');
  return data.data;
};

/**
 * Delete recurrence rule for a task
 */
export const deleteRecurrenceRule = async (taskId: string): Promise<void> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/recurrence`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete recurrence rule');
  }
};

// ============================================================
// TASK INSTANCES API
// ============================================================

import type { TaskInstance } from '../types';

/**
 * Generate instances for a recurring task
 */
export const generateTaskInstances = async (
  taskId: string,
  maxInstances?: number,
  daysAhead?: number
): Promise<TaskInstance[]> => {
  const params = new URLSearchParams();
  if (maxInstances) params.append('max', String(maxInstances));
  if (daysAhead) params.append('days', String(daysAhead));
  
  const response = await authenticatedFetch(
    `/api/tasks/${taskId}/instances/generate${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'POST',
    }
  );
  
  const data: ApiResponse<TaskInstance[]> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to generate instances');
  }
  
  return data.data || [];
};

/**
 * Get all instances for a task
 */
export const getTaskInstances = async (taskId: string): Promise<TaskInstance[]> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/instances`);
  
  const data: ApiResponse<TaskInstance[]> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch task instances');
  }
  
  return data.data || [];
};

// ============================================================
// TAGS API
// ============================================================

import type { Tag, CreateTagDTO, UpdateTagDTO } from '../types';

/**
 * Get all tags for the current user
 */
export const getTags = async (): Promise<Tag[]> => {
  const response = await authenticatedFetch('/api/tags');
  
  const data: ApiResponse<Tag[]> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch tags');
  }
  
  return data.data || [];
};

/**
 * Create a new tag
 */
export const createTag = async (tagData: CreateTagDTO): Promise<Tag> => {
  const response = await authenticatedFetch('/api/tags', {
    method: 'POST',
    body: JSON.stringify(tagData),
  });
  
  const data: ApiResponse<Tag> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to create tag');
  }
  
  if (!data.data) throw new Error('Failed to create tag');
  return data.data;
};

/**
 * Update a tag
 */
export const updateTag = async (tagId: string, updates: UpdateTagDTO): Promise<Tag> => {
  const response = await authenticatedFetch(`/api/tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  
  const data: ApiResponse<Tag> = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Failed to update tag');
  }
  
  if (!data.data) throw new Error('Failed to update tag');
  return data.data;
};

/**
 * Delete a tag
 */
export const deleteTag = async (tagId: string): Promise<void> => {
  const response = await authenticatedFetch(`/api/tags/${tagId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete tag');
  }
};

