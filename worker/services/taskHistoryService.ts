import type { D1Database } from '@cloudflare/workers-types';
import type { TaskHistory } from '../../src/types';
import { nanoid } from 'nanoid';

export class TaskHistoryService {
  constructor(private db: D1Database) {}

  /**
   * Log a change to task history
   */
  async logChange(
    taskId: string,
    userId: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null
  ): Promise<void> {
    const historyId = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `
        INSERT INTO task_history (id, task_id, user_id, field_name, old_value, new_value, changed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(historyId, taskId, userId, fieldName, oldValue, newValue, now)
      .run();
  }

  /**
   * Get history for a task
   */
  async getTaskHistory(taskId: string, userId: string): Promise<TaskHistory[]> {
    // Check if user has access to this task
    const taskCheck = await this.db
      .prepare(
        `
        SELECT 1 FROM tasks 
        WHERE id = ? AND (user_id = ? OR id IN (
          SELECT task_id FROM task_shares WHERE task_id = ? AND shared_with_id = ?
        ))
      `
      )
      .bind(taskId, userId, taskId, userId)
      .first();

    if (!taskCheck) {
      throw new Error('Task not found or no permission');
    }

    const result = await this.db
      .prepare(
        `
        SELECT 
          th.*,
          u.email,
          u.display_name
        FROM task_history th
        LEFT JOIN users u ON th.user_id = u.id
        WHERE th.task_id = ?
        ORDER BY th.changed_at DESC
      `
      )
      .bind(taskId)
      .all();

    return (result.results as any[]).map((row) => ({
      id: row.id,
      task_id: row.task_id,
      user_id: row.user_id,
      field_name: row.field_name,
      old_value: row.old_value,
      new_value: row.new_value,
      changed_at: row.changed_at,
      user: row.email
        ? {
            id: row.user_id,
            email: row.email,
            display_name: row.display_name,
          }
        : undefined,
    }));
  }

  /**
   * Get field label in Russian
   */
  getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      title: 'Название',
      description: 'Описание',
      start_datetime: 'Дата начала',
      deadline_datetime: 'Дедлайн',
      priority: 'Приоритет',
      status: 'Статус',
      is_archived: 'Архивирование',
      is_recurring: 'Периодичность',
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Format value for display
   */
  formatValue(fieldName: string, value: string | null): string {
    if (!value) return '—';

    if (fieldName.includes('datetime')) {
      try {
        return new Date(value).toLocaleString('ru-RU', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      } catch {
        return value;
      }
    }

    if (fieldName === 'priority') {
      const priorities: Record<string, string> = {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий',
        critical: 'Критический',
      };
      return priorities[value] || value;
    }

    if (fieldName === 'status') {
      const statuses: Record<string, string> = {
        planned: 'Запланирована',
        in_progress: 'В работе',
        done: 'Выполнена',
        skipped: 'Пропущена',
        canceled: 'Отменена',
      };
      return statuses[value] || value;
    }

    if (fieldName === 'is_archived' || fieldName === 'is_recurring') {
      return value === 'true' || value === '1' ? 'Да' : 'Нет';
    }

    return value;
  }
}

