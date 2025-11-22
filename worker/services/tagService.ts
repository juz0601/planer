import type { D1Database } from '@cloudflare/workers-types';
import type { Tag, CreateTagDTO, UpdateTagDTO } from '../../src/types';
import { nanoid } from 'nanoid';

export class TagService {
  constructor(private db: D1Database) {}

  /**
   * Get all tags for a user
   */
  async getTags(userId: string): Promise<Tag[]> {
    const result = await this.db
      .prepare(`
        SELECT t.*, 
          COUNT(DISTINCT tt.task_id) as task_count
        FROM tags t
        LEFT JOIN task_tags tt ON t.id = tt.tag_id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY t.name ASC
      `)
      .bind(userId)
      .all();
    
    return result.results as any[];
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(tagId: string, userId: string): Promise<Tag | null> {
    const result = await this.db
      .prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
      .bind(tagId, userId)
      .first();
    
    return result as Tag | null;
  }

  /**
   * Create a new tag
   */
  async createTag(userId: string, data: CreateTagDTO): Promise<Tag> {
    const tagId = nanoid();
    const color = data.color || '#1976d2';
    const now = new Date().toISOString();
    
    // Check if tag with same name already exists
    const existing = await this.db
      .prepare('SELECT id FROM tags WHERE user_id = ? AND name = ?')
      .bind(userId, data.name)
      .first();
    
    if (existing) {
      throw new Error('Tag with this name already exists');
    }
    
    await this.db
      .prepare(`
        INSERT INTO tags (id, user_id, name, color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(tagId, userId, data.name, color, now)
      .run();
    
    const tag = await this.getTagById(tagId, userId);
    return tag!;
  }

  /**
   * Update a tag
   */
  async updateTag(
    tagId: string,
    userId: string,
    data: UpdateTagDTO
  ): Promise<Tag | null> {
    // Check if tag belongs to user
    const existing = await this.getTagById(tagId, userId);
    if (!existing) {
      throw new Error('Tag not found or no permission');
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      // Check if name is already taken
      const duplicate = await this.db
        .prepare('SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?')
        .bind(userId, data.name, tagId)
        .first();
      
      if (duplicate) {
        throw new Error('Tag with this name already exists');
      }
      
      updates.push('name = ?');
      params.push(data.name);
    }
    
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
    
    if (updates.length === 0) {
      return existing;
    }
    
    const query = `UPDATE tags SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    params.push(tagId, userId);
    
    await this.db.prepare(query).bind(...params).run();
    
    return this.getTagById(tagId, userId);
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string, userId: string): Promise<boolean> {
    // Check if tag belongs to user
    const existing = await this.getTagById(tagId, userId);
    if (!existing) {
      return false;
    }
    
    // Delete tag (task_tags will be deleted by CASCADE)
    await this.db
      .prepare('DELETE FROM tags WHERE id = ? AND user_id = ?')
      .bind(tagId, userId)
      .run();
    
    return true;
  }

  /**
   * Get tags used in tasks for a specific date range
   */
  async getTagsForDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Tag[]> {
    const result = await this.db
      .prepare(`
        SELECT DISTINCT t.*
        FROM tags t
        INNER JOIN task_tags tt ON t.id = tt.tag_id
        INNER JOIN tasks task ON tt.task_id = task.id
        WHERE t.user_id = ?
          AND DATE(task.start_datetime) BETWEEN ? AND ?
        ORDER BY t.name ASC
      `)
      .bind(userId, startDate, endDate)
      .all();
    
    return result.results as any[];
  }
}

