import type { D1Database } from '@cloudflare/workers-types';
import type { TaskInstance } from '../../src/types';
import { nanoid } from 'nanoid';
import { RecurrenceService } from './recurrenceService';

export class TaskInstanceService {
  private recurrenceService: RecurrenceService;

  constructor(private db: D1Database) {
    this.recurrenceService = new RecurrenceService(db);
  }

  /**
   * Generate task instances for a recurring task
   * This creates future instances based on the recurrence rule
   */
  async generateInstances(
    taskId: string,
    userId: string,
    maxInstances: number = 30,
    daysAhead: number = 90
  ): Promise<TaskInstance[]> {
    // Get the parent task using direct DB query to avoid circular dependency
    const parentTaskResult = await this.db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(taskId, userId)
      .first();
    
    if (!parentTaskResult) {
      throw new Error('Task not found');
    }
    
    const parentTask = parentTaskResult as any;
    if (!parentTask || !parentTask.is_recurring || !parentTask.recurrence_rule_id) {
      throw new Error('Task is not recurring or rule not found');
    }

    // Get recurrence rule
    const rule = await this.recurrenceService.getRule(parentTask.recurrence_rule_id);
    if (!rule) {
      throw new Error('Recurrence rule not found');
    }

    // Get existing instances to avoid duplicates
    const existingInstances = await this.getInstances(taskId);
    const existingDates = new Set(
      existingInstances.map((inst) => new Date(inst.scheduled_date).toISOString().split('T')[0])
    );

    const instances: TaskInstance[] = [];
    const startDate = new Date(parentTask.start_datetime);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    let currentDate = new Date(startDate);
    let occurrenceCount = 0;

    // Generate instances
    while (occurrenceCount < maxInstances && currentDate <= endDate) {
      // Check if we should continue
      if (!this.recurrenceService.shouldContinue(rule, occurrenceCount, currentDate)) {
        break;
      }

      const dateStr = currentDate.toISOString().split('T')[0];

      // Skip if instance already exists
      if (!existingDates.has(dateStr)) {
        const instance: TaskInstance = {
          id: nanoid(),
          parent_task_id: taskId,
          scheduled_date: currentDate.toISOString(),
          status: 'planned',
          is_modified: false,
          created_at: new Date().toISOString(),
        };

        instances.push(instance);
      }

      // Calculate next occurrence
      const nextDate = this.recurrenceService.calculateNextOccurrence(rule, currentDate, startDate);
      if (!nextDate) {
        break;
      }

      currentDate = nextDate;
      occurrenceCount++;
    }

    // Save instances to database
    if (instances.length > 0) {
      await this.saveInstances(instances);
    }

    return instances;
  }

  /**
   * Get all instances for a task
   */
  async getInstances(taskId: string): Promise<TaskInstance[]> {
    const result = await this.db
      .prepare('SELECT * FROM task_instances WHERE parent_task_id = ? ORDER BY scheduled_date ASC')
      .bind(taskId)
      .all();

    return (result.results as any[]).map((row) => this.mapRowToInstance(row));
  }

  /**
   * Get a single instance by ID
   */
  async getInstance(instanceId: string, userId: string): Promise<TaskInstance | null> {
    const result = await this.db
      .prepare(
        `
        SELECT ti.* FROM task_instances ti
        INNER JOIN tasks t ON ti.parent_task_id = t.id
        WHERE ti.id = ? AND (t.user_id = ? OR t.id IN (
          SELECT task_id FROM task_shares WHERE task_id = t.id AND shared_with_id = ?
        ))
      `
      )
      .bind(instanceId, userId, userId)
      .first();

    if (!result) return null;

    return this.mapRowToInstance(result as any);
  }

  /**
   * Update an instance
   */
  async updateInstance(
    instanceId: string,
    userId: string,
    updates: {
      status?: string;
      modified_title?: string;
      modified_description?: string;
      modified_time?: string;
    }
  ): Promise<TaskInstance | null> {
    // Check permission
    const instance = await this.getInstance(instanceId, userId);
    if (!instance) {
      return null;
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updates.status);
    }

    if (updates.modified_title !== undefined) {
      updateFields.push('modified_title = ?');
      params.push(updates.modified_title);
      updateFields.push('is_modified = 1');
    }

    if (updates.modified_description !== undefined) {
      updateFields.push('modified_description = ?');
      params.push(updates.modified_description);
      updateFields.push('is_modified = 1');
    }

    if (updates.modified_time !== undefined) {
      updateFields.push('modified_time = ?');
      params.push(updates.modified_time);
      updateFields.push('is_modified = 1');
    }

    if (updateFields.length === 0) {
      return instance;
    }

    params.push(instanceId);

    await this.db
      .prepare(`UPDATE task_instances SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();

    return this.getInstance(instanceId, userId);
  }

  /**
   * Delete an instance
   */
  async deleteInstance(instanceId: string, userId: string): Promise<boolean> {
    // Check permission
    const instance = await this.getInstance(instanceId, userId);
    if (!instance) {
      return false;
    }

    await this.db.prepare('DELETE FROM task_instances WHERE id = ?').bind(instanceId).run();
    return true;
  }

  /**
   * Save instances to database
   */
  private async saveInstances(instances: TaskInstance[]): Promise<void> {
    for (const instance of instances) {
      await this.db
        .prepare(
          `
          INSERT INTO task_instances (
            id, parent_task_id, scheduled_date, status, is_modified,
            modified_title, modified_description, modified_time, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          instance.id,
          instance.parent_task_id,
          instance.scheduled_date,
          instance.status,
          instance.is_modified ? 1 : 0,
          instance.modified_title || null,
          instance.modified_description || null,
          instance.modified_time || null,
          instance.created_at || new Date().toISOString()
        )
        .run();
    }
  }

  /**
   * Map database row to TaskInstance
   */
  private mapRowToInstance(row: any): TaskInstance {
    return {
      id: row.id,
      parent_task_id: row.parent_task_id,
      scheduled_date: row.scheduled_date,
      status: row.status,
      is_modified: Boolean(row.is_modified),
      modified_title: row.modified_title || undefined,
      modified_description: row.modified_description || undefined,
      modified_time: row.modified_time || undefined,
      created_at: row.created_at,
    };
  }
}

