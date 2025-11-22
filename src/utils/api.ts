/**
 * API utility functions with Firebase Auth integration
 */

/**
 * Get the Firebase auth token from localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('firebaseToken');
};

/**
 * Make an authenticated API request
 * @param endpoint - API endpoint (e.g., '/api/profile')
 * @param options - Fetch options
 */
export const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // If unauthorized, token might be expired
  if (response.status === 401) {
    localStorage.removeItem('firebaseToken');
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

import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, ApiResponse } from '../types';

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

