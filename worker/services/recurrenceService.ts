import type { D1Database } from '@cloudflare/workers-types';
import type { RecurrenceRule, RecurrenceType, RecurrenceEndType } from '../../src/types';
import { nanoid } from 'nanoid';

export class RecurrenceService {
  constructor(private db: D1Database) {}

  /**
   * Create a recurrence rule for a task
   */
  async createRule(
    taskId: string,
    rule: Omit<RecurrenceRule, 'id' | 'created_at'>
  ): Promise<RecurrenceRule> {
    const ruleId = nanoid();
    const now = new Date().toISOString();

    // Validate rule
    this.validateRule(rule);

    await this.db
      .prepare(
        `
        INSERT INTO recurrence_rules (
          id, task_id, type, interval, days_of_week, day_of_month,
          end_type, end_date, end_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        ruleId,
        taskId,
        rule.type,
        rule.interval,
        rule.days_of_week ? JSON.stringify(rule.days_of_week) : null,
        rule.day_of_month || null,
        rule.end_type,
        rule.end_date || null,
        rule.end_count || null,
        now
      )
      .run();

    // Update task to mark as recurring
    await this.db
      .prepare('UPDATE tasks SET is_recurring = 1, recurrence_rule_id = ? WHERE id = ?')
      .bind(ruleId, taskId)
      .run();

    return this.getRule(ruleId);
  }

  /**
   * Get a recurrence rule by ID
   */
  async getRule(ruleId: string): Promise<RecurrenceRule> {
    const result = await this.db
      .prepare('SELECT * FROM recurrence_rules WHERE id = ?')
      .bind(ruleId)
      .first();

    if (!result) {
      throw new Error('Recurrence rule not found');
    }

    return this.mapRowToRule(result as any);
  }

  /**
   * Get recurrence rule for a task
   */
  async getRuleByTaskId(taskId: string): Promise<RecurrenceRule | null> {
    const result = await this.db
      .prepare('SELECT * FROM recurrence_rules WHERE task_id = ?')
      .bind(taskId)
      .first();

    if (!result) {
      return null;
    }

    return this.mapRowToRule(result as any);
  }

  /**
   * Update a recurrence rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<Omit<RecurrenceRule, 'id' | 'created_at' | 'task_id'>>
  ): Promise<RecurrenceRule> {
    // Get current rule
    const currentRule = await this.getRule(ruleId);

    // Merge updates
    const updatedRule: Omit<RecurrenceRule, 'id' | 'created_at'> = {
      type: updates.type ?? currentRule.type,
      interval: updates.interval ?? currentRule.interval,
      days_of_week: updates.days_of_week ?? currentRule.days_of_week,
      day_of_month: updates.day_of_month ?? currentRule.day_of_month,
      end_type: updates.end_type ?? currentRule.end_type,
      end_date: updates.end_date ?? currentRule.end_date,
      end_count: updates.end_count ?? currentRule.end_count,
    };

    // Validate updated rule
    this.validateRule(updatedRule);

    await this.db
      .prepare(
        `
        UPDATE recurrence_rules SET
          type = ?,
          interval = ?,
          days_of_week = ?,
          day_of_month = ?,
          end_type = ?,
          end_date = ?,
          end_count = ?
        WHERE id = ?
      `
      )
      .bind(
        updatedRule.type,
        updatedRule.interval,
        updatedRule.days_of_week ? JSON.stringify(updatedRule.days_of_week) : null,
        updatedRule.day_of_month || null,
        updatedRule.end_type,
        updatedRule.end_date || null,
        updatedRule.end_count || null,
        ruleId
      )
      .run();

    return this.getRule(ruleId);
  }

  /**
   * Delete a recurrence rule
   */
  async deleteRule(ruleId: string, taskId: string): Promise<void> {
    await this.db.prepare('DELETE FROM recurrence_rules WHERE id = ?').bind(ruleId).run();

    // Update task to remove recurring flag
    await this.db
      .prepare('UPDATE tasks SET is_recurring = 0, recurrence_rule_id = NULL WHERE id = ?')
      .bind(taskId)
      .run();
  }

  /**
   * Validate recurrence rule
   */
  private validateRule(rule: Omit<RecurrenceRule, 'id' | 'created_at'>): void {
    if (rule.interval < 1) {
      throw new Error('Interval must be at least 1');
    }

    if (rule.type === 'weekly' && (!rule.days_of_week || rule.days_of_week.length === 0)) {
      throw new Error('Weekly recurrence requires at least one day of week');
    }

    if (rule.type === 'monthly' && !rule.day_of_month) {
      throw new Error('Monthly recurrence requires day_of_month');
    }

    if (rule.end_type === 'date' && !rule.end_date) {
      throw new Error('End type "date" requires end_date');
    }

    if (rule.end_type === 'count' && (!rule.end_count || rule.end_count < 1)) {
      throw new Error('End type "count" requires end_count >= 1');
    }
  }

  /**
   * Map database row to RecurrenceRule
   */
  private mapRowToRule(row: any): RecurrenceRule {
    return {
      id: row.id,
      type: row.type as RecurrenceType,
      interval: row.interval,
      days_of_week: row.days_of_week ? JSON.parse(row.days_of_week) : undefined,
      day_of_month: row.day_of_month || undefined,
      end_type: row.end_type as RecurrenceEndType,
      end_date: row.end_date || undefined,
      end_count: row.end_count || undefined,
      created_at: row.created_at,
    };
  }

  /**
   * Calculate next occurrence date based on rule
   */
  calculateNextOccurrence(
    rule: RecurrenceRule,
    lastOccurrence: Date,
    _startDate: Date
  ): Date | null {
    const next = new Date(lastOccurrence);

    switch (rule.type) {
      case 'daily':
        next.setDate(next.getDate() + rule.interval);
        break;

      case 'weekly':
        // Find next occurrence on specified days
        let daysToAdd = rule.interval * 7;
        const targetDays = rule.days_of_week || [];
        
        if (targetDays.length > 0) {
          let currentDay = next.getDay();
          // Convert Sunday (0) to 7 for easier calculation
          currentDay = currentDay === 0 ? 7 : currentDay;
          
          // Find next matching day
          const sortedDays = [...targetDays].sort((a, b) => a - b);
          let nextDay = sortedDays.find((d) => d > currentDay);
          
          if (!nextDay) {
            // Next week
            nextDay = sortedDays[0];
            daysToAdd = (7 - currentDay + nextDay) + (rule.interval - 1) * 7;
          } else {
            daysToAdd = nextDay - currentDay;
          }
          
          next.setDate(next.getDate() + daysToAdd);
        } else {
          next.setDate(next.getDate() + daysToAdd);
        }
        break;

      case 'monthly':
        if (rule.day_of_month) {
          next.setMonth(next.getMonth() + rule.interval);
          next.setDate(rule.day_of_month);
        } else {
          next.setMonth(next.getMonth() + rule.interval);
        }
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + rule.interval);
        break;

      case 'workdays':
        // Monday to Friday
        let added = 0;
        while (added < rule.interval) {
          next.setDate(next.getDate() + 1);
          const day = next.getDay();
          if (day !== 0 && day !== 6) {
            // Not Sunday or Saturday
            added++;
          }
        }
        break;

      case 'weekends':
        // Saturday and Sunday
        let addedWeekends = 0;
        while (addedWeekends < rule.interval) {
          next.setDate(next.getDate() + 1);
          const day = next.getDay();
          if (day === 0 || day === 6) {
            // Saturday or Sunday
            addedWeekends++;
          }
        }
        break;

      case 'custom':
        // Custom interval in hours/days/weeks/months
        // For now, treat as days
        next.setDate(next.getDate() + rule.interval);
        break;

      default:
        return null;
    }

    // Check end conditions
    if (rule.end_type === 'date' && rule.end_date) {
      const endDate = new Date(rule.end_date);
      if (next > endDate) {
        return null;
      }
    }

    return next;
  }

  /**
   * Check if rule should continue generating instances
   */
  shouldContinue(rule: RecurrenceRule, occurrenceCount: number, currentDate: Date): boolean {
    if (rule.end_type === 'never') {
      return true;
    }

    if (rule.end_type === 'date' && rule.end_date) {
      const endDate = new Date(rule.end_date);
      return currentDate <= endDate;
    }

    if (rule.end_type === 'count' && rule.end_count) {
      return occurrenceCount < rule.end_count;
    }

    return true;
  }
}

