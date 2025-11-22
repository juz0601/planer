// ============================================================
// ENUMS AND TYPES
// ============================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'skipped' | 'canceled';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'workdays' | 'weekends';
export type RecurrenceEndType = 'never' | 'date' | 'count';
export type SharePermission = 'view' | 'edit';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

// ============================================================
// USER
// ============================================================

export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================
// TASK
// ============================================================

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  deadline_datetime?: string;
  priority: TaskPriority;
  status: TaskStatus;
  is_recurring: boolean;
  recurrence_rule_id?: string;
  recurrence_rule?: RecurrenceRule;
  tags?: Tag[];
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Shared task metadata (populated when fetching shared tasks)
  is_shared?: boolean;
  shared_by?: string;          // email of owner
  shared_by_name?: string;     // display name of owner
  permission?: SharePermission;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  start_datetime: string;
  deadline_datetime?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  tag_ids?: string[];
  is_recurring?: boolean;
  recurrence_rule?: Omit<RecurrenceRule, 'id' | 'created_at'>;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  start_datetime?: string;
  deadline_datetime?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  tag_ids?: string[];
  is_archived?: boolean;
}

// ============================================================
// TAG
// ============================================================

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface CreateTagDTO {
  name: string;
  color?: string;
}

export interface UpdateTagDTO {
  name?: string;
  color?: string;
}

// ============================================================
// RECURRENCE
// ============================================================

export interface RecurrenceRule {
  id: string;
  type: RecurrenceType;
  interval: number;
  days_of_week?: number[];     // 0 = Monday, 6 = Sunday
  day_of_month?: number;
  end_type: RecurrenceEndType;
  end_date?: string;
  end_count?: number;
  created_at?: string;
}

export interface TaskInstance {
  id: string;
  parent_task_id: string;
  scheduled_date: string;
  status: TaskStatus;
  is_modified: boolean;
  modified_title?: string;
  modified_description?: string;
  modified_time?: string;
  created_at?: string;
}

// ============================================================
// SHARING
// ============================================================

export interface TaskShare {
  id: string;
  task_id: string;
  owner_id: string;
  shared_with_id: string;
  permission: SharePermission;
  created_at?: string;
  
  // Populated data
  shared_with?: User;
}

export interface CreateTaskShareDTO {
  shared_with_email: string;
  permission: SharePermission;
}

// ============================================================
// FRIENDSHIPS
// ============================================================

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at?: string;
  updated_at?: string;
  
  // Populated friend data
  friend?: User;
}

export interface CreateFriendRequestDTO {
  friend_email: string;
}

// ============================================================
// TASK HISTORY
// ============================================================

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
  
  // Populated user data
  user?: User;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// ============================================================
// QUERY FILTERS
// ============================================================

export interface TaskFilters {
  date?: string;              // YYYY-MM-DD
  start_date?: string;        // YYYY-MM-DD
  end_date?: string;          // YYYY-MM-DD
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];            // tag IDs
  search?: string;            // search in title and description
  include_archived?: boolean;
  include_shared?: boolean;
  only_shared?: boolean;
  sort_by?: 'start_datetime' | 'priority' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

