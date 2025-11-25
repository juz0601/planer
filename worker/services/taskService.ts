import type { D1Database } from '@cloudflare/workers-types';
import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters } from '../../src/types';
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
        query += ` AND DATE(t.start_datetime) = ?`;
        params.push(filters.date);
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
      
      // Sorting
      const sortBy = filters.sort_by || 'start_datetime';
      const sortOrder = filters.sort_order || 'asc';
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
      
      const result = await this.db.prepare(query).bind(...params).all();
      
      if (!result.success) {
        console.error('Database query failed:', result.error, query, params);
        throw new Error(`Database query failed: ${result.error || 'Unknown error'}`);
      }
      
      if (!result.results) {
        return [];
      }
      
      return (result.results as any[]).map(row => {
        try {
          return this.mapRowToTask(row);
        } catch (error: any) {
          console.error('Error mapping task row:', error, row);
          // Return a minimal task object if mapping fails
          return {
            id: row.id,
            user_id: row.user_id,
            title: row.title || 'Untitled',
            description: row.description,
            start_datetime: row.start_datetime,
            deadline_datetime: row.deadline_datetime,
            priority: row.priority || 'medium',
            status: row.status || 'planned',
            is_recurring: Boolean(row.is_recurring),
            recurrence_rule_id: row.recurrence_rule_id,
            is_archived: Boolean(row.is_archived),
            created_at: row.created_at,
            updated_at: row.updated_at,
            tags: [],
          } as Task;
        }
      });
    } catch (error: any) {
      console.error('Error in getTasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message || 'Unknown error'}`);
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
    const task: Task = {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      start_datetime: row.start_datetime,
      deadline_datetime: row.deadline_datetime,
      priority: row.priority,
      status: row.status,
      is_recurring: Boolean(row.is_recurring),
      recurrence_rule_id: row.recurrence_rule_id,
      is_archived: Boolean(row.is_archived),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    
    // Map tags if available
    if (row.tag_ids && row.tag_names && row.tag_colors) {
      try {
        const ids = row.tag_ids.split(',').filter((id: string) => id && id.trim());
        const names = row.tag_names.split(',').filter((name: string) => name && name.trim());
        const colors = row.tag_colors.split(',').filter((color: string) => color && color.trim());
        
        if (ids.length > 0 && ids.length === names.length && ids.length === colors.length) {
          task.tags = ids.map((id: string, index: number) => ({
            id: id.trim(),
            name: names[index]?.trim() || '',
            color: colors[index]?.trim() || '#000000',
            user_id: row.user_id,
          }));
        }
      } catch (error) {
        console.error('Error parsing tags:', error, row);
        // If tag parsing fails, just skip tags
        task.tags = [];
      }
    }
    
    // Map shared task metadata
    if (row.share_owner_id) {
      task.is_shared = true;
      task.shared_by = row.shared_by_email;
      task.shared_by_name = row.shared_by_name;
      task.permission = row.share_permission;
    }
    
    return task;
  }
}



