/**
 * API utility functions with Firebase Auth integration
 */

import { auth } from '../config/firebase';

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
  const response = await authenticatedFetch(endpoint);
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  
  const data: ApiResponse<Task[]> = await response.json();
  return data.data || [];
};

/**
 * Get a single task by ID
 */
export const getTaskById = async (taskId: string): Promise<Task> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch task');
  }
  
  const data: ApiResponse<Task> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create task');
  }
  
  const data: ApiResponse<Task> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update task');
  }
  
  const data: ApiResponse<Task> = await response.json();
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
  
  if (!response.ok) {
    throw new Error('Failed to duplicate task');
  }
  
  const data: ApiResponse<Task> = await response.json();
  if (!data.data) throw new Error('Failed to duplicate task');
  return data.data;
};

/**
 * Get task history
 */
export const getTaskHistory = async (taskId: string): Promise<TaskHistory[]> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/history`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch task history');
  }
  
  const data: ApiResponse<TaskHistory[]> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create recurrence rule');
  }
  
  const data: ApiResponse<RecurrenceRule> = await response.json();
  if (!data.data) throw new Error('Failed to create recurrence rule');
  return data.data;
};

/**
 * Get recurrence rule for a task
 */
export const getRecurrenceRule = async (taskId: string): Promise<RecurrenceRule | null> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/recurrence`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch recurrence rule');
  }
  
  const data: ApiResponse<RecurrenceRule> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update recurrence rule');
  }
  
  const data: ApiResponse<RecurrenceRule> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate instances');
  }
  
  const data: ApiResponse<TaskInstance[]> = await response.json();
  return data.data || [];
};

/**
 * Get all instances for a task
 */
export const getTaskInstances = async (taskId: string): Promise<TaskInstance[]> => {
  const response = await authenticatedFetch(`/api/tasks/${taskId}/instances`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch task instances');
  }
  
  const data: ApiResponse<TaskInstance[]> = await response.json();
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
  
  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }
  
  const data: ApiResponse<Tag[]> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create tag');
  }
  
  const data: ApiResponse<Tag> = await response.json();
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
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update tag');
  }
  
  const data: ApiResponse<Tag> = await response.json();
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

