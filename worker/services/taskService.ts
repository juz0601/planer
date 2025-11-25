import type { D1Database } from '@cloudflare/workers-types';
import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters } from '../../src/types';
import { nanoid } from 'nanoid';

export class TaskService {
  constructor(private db: D1Database) {}

  /**
   * Get tasks for a user with optional filters
   */
  async getTasks(userId: string, filters: TaskFilters = {}): Promise<Task[]> {
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
    
    return (result.results as any[]).map(row => this.mapRowToTask(row));
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
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    
    if (data.start_datetime !== undefined) {
      updates.push('start_datetime = ?');
      params.push(data.start_datetime);
    }
    
    if (data.deadline_datetime !== undefined) {
      updates.push('deadline_datetime = ?');
      params.push(data.deadline_datetime);
    }
    
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      params.push(data.priority);
    }
    
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    
    if (data.is_archived !== undefined) {
      updates.push('is_archived = ?');
      params.push(data.is_archived ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return this.getTaskById(taskId, userId);
    }
    
    updates.push('updated_at = datetime("now")');
    
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    params.push(taskId);
    
    await this.db.prepare(query).bind(...params).run();
    
    // Update tags if provided
    if (data.tag_ids !== undefined) {
      await this.updateTaskTags(taskId, data.tag_ids);
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
    if (row.tag_ids) {
      const ids = row.tag_ids.split(',');
      const names = row.tag_names.split(',');
      const colors = row.tag_colors.split(',');
      
      task.tags = ids.map((id: string, index: number) => ({
        id,
        name: names[index],
        color: colors[index],
        user_id: row.user_id,
      }));
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



