import type { D1Database } from '@cloudflare/workers-types';
import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, SharePermission } from '../../src/types';
import { nanoid } from 'nanoid';
import { TaskHistoryService } from './taskHistoryService';
import { RecurrenceService } from './recurrenceService';
import { TaskInstanceService } from './taskInstanceService';

export class TaskService {
  private historyService: TaskHistoryService;
  private recurrenceService: RecurrenceService;
  private instanceService: TaskInstanceService;

  constructor(private db: D1Database) {
    this.historyService = new TaskHistoryService(db);
    this.recurrenceService = new RecurrenceService(db);
    this.instanceService = new TaskInstanceService(db);
  }

  /**
   * Get tasks for a user with optional filters
   */
  async getTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
    try {
      let query = `
        SELECT t.*, 
          GROUP_CONCAT(DISTINCT tag.id) as tag_ids,
          GROUP_CONCAT(DISTINCT tag.name) as tag_names,
          GROUP_CONCAT(DISTINCT tag.color) as tag_colors
        FROM tasks t
        LEFT JOIN task_tags tt ON t.id = tt.task_id
        LEFT JOIN tags tag ON tt.tag_id = tag.id
        WHERE (t.user_id = ? OR t.id IN (
          SELECT task_id FROM task_shares WHERE shared_with_id = ?
        ))
      `;
      
      const params: any[] = [userId, userId];
      
      // Apply filters
      if (!filters.include_archived) {
        query += ' AND t.is_archived = 0';
      }
      
      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }
      
      if (filters.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
      }
      
      if (filters.date) {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = filters.date.split('T')[0]; // Remove time if present
        // Use date() function for SQLite compatibility
        // D1 uses SQLite, so date() function should work
        // Compare both sides as dates to handle datetime strings properly
        query += ` AND date(t.start_datetime) = date(?)`;
        params.push(dateStr);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ` AND DATE(t.start_datetime) BETWEEN ? AND ?`;
        params.push(filters.start_date, filters.end_date);
      }
      
      if (filters.search) {
        query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (filters.only_shared) {
        query += ` AND t.user_id != ?`;
        params.push(userId);
      }
      
      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        query += ` AND t.id IN (
          SELECT DISTINCT task_id FROM task_tags WHERE tag_id IN (${filters.tags.map(() => '?').join(',')})
        )`;
        params.push(...filters.tags);
      }
      
      query += ' GROUP BY t.id';
      
      // Sorting - validate to prevent SQL injection
      const allowedSortFields = ['start_datetime', 'deadline_datetime', 'created_at', 'updated_at', 'priority', 'status', 'title'];
      const sortBy = filters.sort_by && allowedSortFields.includes(filters.sort_by) 
        ? filters.sort_by 
        : 'start_datetime';
      const sortOrder = filters.sort_order === 'desc' ? 'desc' : 'asc';
      query += ` ORDER BY t.${sortBy} ${sortOrder}`;
      
      // Pagination
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        
        if (filters.page && filters.page > 1) {
          query += ' OFFSET ?';
          params.push((filters.page - 1) * filters.limit);
        }
      }
      
      let result;
      try {
        result = await this.db.prepare(query).bind(...params).all();
      } catch (dbError: any) {
        // Safe error logging
        const errorMsg = dbError?.message || String(dbError) || 'Database query execution failed';
        console.error('Database query execution error:', errorMsg);
        console.error('Query:', query.substring(0, 200));
        throw new Error(`Database query execution failed: ${errorMsg}`);
      }
      
      if (!result) {
        console.error('Database query returned null/undefined result');
        return [];
      }
      
      if (!result.success) {
        const errorMsg = result.error || 'Unknown database error';
        console.error('Database query failed:', errorMsg);
        console.error('Query:', query.substring(0, 200));
        throw new Error(`Database query failed: ${errorMsg}`);
      }
      
      if (!result.results) {
        return [];
      }
      
      // Convert D1 results to plain objects to avoid serialization issues
      // Use a safe conversion that avoids circular references
      const visited = new WeakSet();
      const safeConvert = (value: any, depth: number = 0): any => {
        // Prevent infinite recursion
        if (depth > 10) {
          return '[Max Depth]';
        }
        
        if (value === null || value === undefined) {
          return value;
        }
        
        // Handle primitives
        if (typeof value !== 'object') {
          return value;
        }
        
        // Handle Date
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
          return value.map(item => safeConvert(item, depth + 1));
        }
        
        // Handle objects - check for circular references
        if (visited.has(value)) {
          return '[Circular Reference]';
        }
        
        try {
          visited.add(value);
          const plain: any = {};
          for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
              try {
                plain[key] = safeConvert(value[key], depth + 1);
              } catch {
                plain[key] = '[Conversion Error]';
              }
            }
          }
          visited.delete(value);
          return plain;
        } catch {
          return String(value);
        }
      };
      
      const plainRows = (result.results as any[]).map(row => {
        try {
          return safeConvert(row);
        } catch (error) {
          // If conversion fails, create minimal safe object
          const safeRow: any = {};
          try {
            if (row && typeof row === 'object') {
              for (const key of ['id', 'user_id', 'title', 'description', 'start_datetime', 'deadline_datetime', 'priority', 'status', 'is_recurring', 'recurrence_rule_id', 'is_archived', 'created_at', 'updated_at', 'tag_ids', 'tag_names', 'tag_colors']) {
                try {
                  if (key in row) {
                    const val = row[key];
                    safeRow[key] = val === null || val === undefined ? val : String(val);
                  }
                } catch {
                  // Skip this key if access fails
                }
              }
            }
          } catch {
            // If all else fails, return empty object
          }
          return safeRow;
        }
      });
      
      return plainRows.map(row => {
        try {
          // Ensure row is a plain object before mapping
          const safeRow = row && typeof row === 'object' ? { ...row } : row;
          return this.mapRowToTask(safeRow);
        } catch (error: any) {
          // Safe error logging to avoid recursion
          let errorMsg = 'Unknown mapping error';
          let rowId = 'unknown';
          
          try {
            errorMsg = error?.message || String(error) || 'Unknown mapping error';
            rowId = row && typeof row === 'object' && 'id' in row ? String(row.id) : 'unknown';
          } catch {
            // If we can't extract info, use defaults
          }
          
          console.error('Error mapping task row:', errorMsg, 'Row ID:', rowId);
          
          // Return a minimal task object if mapping fails
          // Safely extract values to avoid proxy/getter issues
          const safeGet = (obj: any, key: string, defaultValue: any = null) => {
            try {
              if (obj && typeof obj === 'object' && key in obj) {
                const value = obj[key];
                return value === null || value === undefined ? defaultValue : value;
              }
              return defaultValue;
            } catch {
              return defaultValue;
            }
          };
          
          return {
            id: String(safeGet(row, 'id', '')),
            user_id: String(safeGet(row, 'user_id', '')),
            title: String(safeGet(row, 'title', 'Untitled')),
            description: safeGet(row, 'description') ? String(safeGet(row, 'description')) : undefined,
            start_datetime: String(safeGet(row, 'start_datetime', new Date().toISOString())),
            deadline_datetime: safeGet(row, 'deadline_datetime') ? String(safeGet(row, 'deadline_datetime')) : undefined,
            priority: (safeGet(row, 'priority', 'medium')) as TaskPriority,
            status: (safeGet(row, 'status', 'planned')) as TaskStatus,
            is_recurring: Boolean(safeGet(row, 'is_recurring', false)),
            recurrence_rule_id: safeGet(row, 'recurrence_rule_id') ? String(safeGet(row, 'recurrence_rule_id')) : undefined,
            is_archived: Boolean(safeGet(row, 'is_archived', false)),
            created_at: safeGet(row, 'created_at') ? String(safeGet(row, 'created_at')) : undefined,
            updated_at: safeGet(row, 'updated_at') ? String(safeGet(row, 'updated_at')) : undefined,
            tags: [],
          } as Task;
        }
      });
    } catch (error: any) {
      // Safe error logging to avoid recursion
      const errorMsg = error?.message || String(error);
      const errorName = error?.name || 'Error';
      const errorStack = error?.stack ? String(error.stack).substring(0, 500) : undefined;
      
      console.error('Error in getTasks:', errorMsg);
      if (errorStack) {
        console.error('Error stack (truncated):', errorStack);
      }
      
      // Re-throw original error if it's already an Error, otherwise wrap it
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch tasks: ${errorMsg}`);
    }
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string, userId: string): Promise<Task | null> {
    const query = `
      SELECT t.*, 
        ts.owner_id as share_owner_id,
        ts.permission as share_permission,
        u.email as shared_by_email,
        u.display_name as shared_by_name
      FROM tasks t
      LEFT JOIN task_shares ts ON t.id = ts.task_id AND ts.shared_with_id = ?
      LEFT JOIN users u ON ts.owner_id = u.id
      WHERE t.id = ? AND (t.user_id = ? OR ts.shared_with_id = ?)
    `;
    
    const result = await this.db
      .prepare(query)
      .bind(userId, taskId, userId, userId)
      .first();
    
    if (!result) return null;
    
    const task = this.mapRowToTask(result as any);
    
    // Load tags
    const tags = await this.getTaskTags(taskId);
    task.tags = tags;
    
    return task;
  }

  /**
   * Create a new task
   */
  async createTask(userId: string, data: CreateTaskDTO): Promise<Task> {
    const taskId = nanoid();
    const now = new Date().toISOString();
    
    await this.db
      .prepare(`
        INSERT INTO tasks (
          id, user_id, title, description, start_datetime, 
          deadline_datetime, priority, status, is_recurring, 
          is_archived, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)
      .bind(
        taskId,
        userId,
        data.title,
        data.description || null,
        data.start_datetime,
        data.deadline_datetime || null,
        data.priority || 'medium',
        data.status || 'planned',
        data.is_recurring ? 1 : 0,
        now,
        now
      )
      .run();
    
    // Add tags if provided
    if (data.tag_ids && data.tag_ids.length > 0) {
      await this.addTagsToTask(taskId, data.tag_ids);
    }
    
    // Create recurrence rule if provided
    if (data.is_recurring && data.recurrence_rule) {
      await this.recurrenceService.createRule(taskId, data.recurrence_rule);
      
      // Generate initial instances for recurring task
      try {
        await this.instanceService.generateInstances(taskId, userId, 30, 90);
      } catch (error) {
        console.error('Error generating initial instances:', error);
        // Don't fail task creation if instance generation fails
      }
    }
    
    const task = await this.getTaskById(taskId, userId);
    return task!;
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string, 
    userId: string, 
    data: UpdateTaskDTO
  ): Promise<Task | null> {
    // Check if user has permission to edit
    const hasPermission = await this.checkEditPermission(taskId, userId);
    if (!hasPermission) {
      throw new Error('No permission to edit this task');
    }
    
    // Get current task to log changes
    const currentTask = await this.getTaskById(taskId, userId);
    if (!currentTask) {
      return null;
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    
    // Track changes for history
    const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];
    
    if (data.title !== undefined && data.title !== currentTask.title) {
      updates.push('title = ?');
      params.push(data.title);
      changes.push({
        field: 'title',
        oldValue: currentTask.title,
        newValue: data.title,
      });
    }
    
    if (data.description !== undefined && data.description !== currentTask.description) {
      updates.push('description = ?');
      params.push(data.description || null);
      changes.push({
        field: 'description',
        oldValue: currentTask.description || null,
        newValue: data.description || null,
      });
    }
    
    if (data.start_datetime !== undefined && data.start_datetime !== currentTask.start_datetime) {
      updates.push('start_datetime = ?');
      params.push(data.start_datetime);
      changes.push({
        field: 'start_datetime',
        oldValue: currentTask.start_datetime,
        newValue: data.start_datetime,
      });
    }
    
    if (data.deadline_datetime !== undefined) {
      const newDeadline = data.deadline_datetime || null;
      const oldDeadline = currentTask.deadline_datetime || null;
      if (newDeadline !== oldDeadline) {
        updates.push('deadline_datetime = ?');
        params.push(newDeadline);
        changes.push({
          field: 'deadline_datetime',
          oldValue: oldDeadline,
          newValue: newDeadline,
        });
      }
    }
    
    if (data.priority !== undefined && data.priority !== currentTask.priority) {
      updates.push('priority = ?');
      params.push(data.priority);
      changes.push({
        field: 'priority',
        oldValue: currentTask.priority,
        newValue: data.priority,
      });
    }
    
    if (data.status !== undefined && data.status !== currentTask.status) {
      updates.push('status = ?');
      params.push(data.status);
      changes.push({
        field: 'status',
        oldValue: currentTask.status,
        newValue: data.status,
      });
    }
    
    if (data.is_archived !== undefined) {
      const newArchived = data.is_archived ? '1' : '0';
      const oldArchived = currentTask.is_archived ? '1' : '0';
      if (newArchived !== oldArchived) {
        updates.push('is_archived = ?');
        params.push(data.is_archived ? 1 : 0);
        changes.push({
          field: 'is_archived',
          oldValue: oldArchived,
          newValue: newArchived,
        });
      }
    }
    
    if (updates.length === 0) {
      return currentTask;
    }
    
    updates.push('updated_at = datetime("now")');
    
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    params.push(taskId);
    
    await this.db.prepare(query).bind(...params).run();
    
    // Log changes to history
    for (const change of changes) {
      await this.historyService.logChange(
        taskId,
        userId,
        change.field,
        change.oldValue,
        change.newValue
      );
    }
    
    // Update tags if provided
    if (data.tag_ids !== undefined) {
      const currentTagIds = (currentTask.tags || []).map(t => t.id).sort().join(',');
      const newTagIds = (data.tag_ids || []).sort().join(',');
      
      if (currentTagIds !== newTagIds) {
        await this.updateTaskTags(taskId, data.tag_ids);
        // Log tag change
        await this.historyService.logChange(
          taskId,
          userId,
          'tags',
          currentTagIds || null,
          newTagIds || null
        );
      }
    }
    
    return this.getTaskById(taskId, userId);
  }

  /**
   * Delete a task (hard delete)
   */
  async deleteTask(taskId: string, userId: string): Promise<boolean> {
    // Only owner can delete
    const task = await this.db
      .prepare('SELECT user_id FROM tasks WHERE id = ?')
      .bind(taskId)
      .first();
    
    if (!task || (task as any).user_id !== userId) {
      return false;
    }
    
    await this.db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
    return true;
  }

  /**
   * Archive a task (soft delete)
   */
  async archiveTask(taskId: string, userId: string): Promise<boolean> {
    const result = await this.updateTask(taskId, userId, { is_archived: true });
    return result !== null;
  }

  /**
   * Duplicate a task
   */
  async duplicateTask(taskId: string, userId: string): Promise<Task | null> {
    const originalTask = await this.getTaskById(taskId, userId);
    if (!originalTask) return null;
    
    const newTask = await this.createTask(userId, {
      title: `${originalTask.title} (copy)`,
      description: originalTask.description,
      start_datetime: originalTask.start_datetime,
      deadline_datetime: originalTask.deadline_datetime,
      priority: originalTask.priority,
      status: 'planned',
      tag_ids: originalTask.tags?.map(t => t.id),
    });
    
    return newTask;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async getTaskTags(taskId: string): Promise<any[]> {
    const result = await this.db
      .prepare(`
        SELECT t.* FROM tags t
        INNER JOIN task_tags tt ON t.id = tt.tag_id
        WHERE tt.task_id = ?
      `)
      .bind(taskId)
      .all();
    
    return result.results as any[];
  }

  private async addTagsToTask(taskId: string, tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.db
        .prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
        .bind(taskId, tagId)
        .run();
    }
  }

  private async updateTaskTags(taskId: string, tagIds: string[]): Promise<void> {
    // Remove all existing tags
    await this.db
      .prepare('DELETE FROM task_tags WHERE task_id = ?')
      .bind(taskId)
      .run();
    
    // Add new tags
    if (tagIds.length > 0) {
      await this.addTagsToTask(taskId, tagIds);
    }
  }

  private async checkEditPermission(taskId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`
        SELECT 1 FROM tasks WHERE id = ? AND user_id = ?
        UNION
        SELECT 1 FROM task_shares 
        WHERE task_id = ? AND shared_with_id = ? AND permission = 'edit'
      `)
      .bind(taskId, userId, taskId, userId)
      .first();
    
    return result !== null;
  }

  private mapRowToTask(row: any): Task {
    // Ensure row is an object to avoid recursion issues
    if (!row || typeof row !== 'object') {
      throw new Error('Invalid row data: row must be an object');
    }
    
    // Safely extract values to avoid proxy/getter issues
    const safeGet = (obj: any, key: string, defaultValue: any = null) => {
      try {
        const value = obj[key];
        return value === null || value === undefined ? defaultValue : value;
      } catch {
        return defaultValue;
      }
    };
    
    const task: Task = {
      id: String(safeGet(row, 'id', '')),
      user_id: String(safeGet(row, 'user_id', '')),
      title: String(safeGet(row, 'title', 'Untitled')),
      description: safeGet(row, 'description') ? String(safeGet(row, 'description')) : undefined,
      start_datetime: String(safeGet(row, 'start_datetime', new Date().toISOString())),
      deadline_datetime: safeGet(row, 'deadline_datetime') ? String(safeGet(row, 'deadline_datetime')) : undefined,
      priority: (safeGet(row, 'priority', 'medium')) as TaskPriority,
      status: (safeGet(row, 'status', 'planned')) as TaskStatus,
      is_recurring: Boolean(safeGet(row, 'is_recurring', false)),
      recurrence_rule_id: safeGet(row, 'recurrence_rule_id') ? String(safeGet(row, 'recurrence_rule_id')) : undefined,
      is_archived: Boolean(safeGet(row, 'is_archived', false)),
      created_at: safeGet(row, 'created_at') ? String(safeGet(row, 'created_at')) : undefined,
      updated_at: safeGet(row, 'updated_at') ? String(safeGet(row, 'updated_at')) : undefined,
      tags: [], // Initialize tags array to avoid undefined
    };
    
    // Map tags if available
    // GROUP_CONCAT can return NULL if no tags, so we need to handle that
    const tagIds = safeGet(row, 'tag_ids');
    const tagNames = safeGet(row, 'tag_names');
    const tagColors = safeGet(row, 'tag_colors');
    
    // Check if we have tag data (not null/undefined/empty)
    if (tagIds != null && tagNames != null && tagColors != null) {
      try {
        const idsStr = String(tagIds).trim();
        const namesStr = String(tagNames).trim();
        const colorsStr = String(tagColors).trim();
        
        // Only process if all strings are non-empty
        if (idsStr && namesStr && colorsStr) {
          const ids = idsStr.split(',').filter((id: string) => id && id.trim());
          const names = namesStr.split(',').filter((name: string) => name && name.trim());
          const colors = colorsStr.split(',').filter((color: string) => color && color.trim());
          
          // Ensure arrays have same length and are not empty
          if (ids.length > 0 && ids.length === names.length && ids.length === colors.length) {
            task.tags = ids.map((id: string, index: number) => {
              try {
                return {
                  id: id.trim(),
                  name: names[index]?.trim() || '',
                  color: colors[index]?.trim() || '#000000',
                  user_id: String(safeGet(row, 'user_id', '')),
                };
              } catch {
                // Skip this tag if mapping fails
                return null;
              }
            }).filter((tag): tag is NonNullable<typeof tag> => tag !== null);
          } else {
            task.tags = [];
          }
        } else {
          task.tags = [];
        }
      } catch (error) {
        // Safe error logging to avoid recursion
        const errorMsg = error instanceof Error ? error.message : String(error);
        const rowId = safeGet(row, 'id', 'unknown');
        console.error('Error parsing tags:', errorMsg, 'Row ID:', rowId);
        // If tag parsing fails, just skip tags
        task.tags = [];
      }
    } else {
      // No tags for this task
      task.tags = [];
    }
    
    // Map shared task metadata
    const shareOwnerId = safeGet(row, 'share_owner_id');
    if (shareOwnerId) {
      task.is_shared = true;
      const sharedByEmail = safeGet(row, 'shared_by_email');
      const sharedByName = safeGet(row, 'shared_by_name');
      const sharePermission = safeGet(row, 'share_permission');
      
      if (sharedByEmail) {
        task.shared_by = String(sharedByEmail);
      }
      if (sharedByName) {
        task.shared_by_name = String(sharedByName);
      }
      if (sharePermission) {
        task.permission = String(sharePermission) as SharePermission;
      }
    }
    
    return task;
  }
}



