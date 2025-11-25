import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { TagService } from '../services/tagService';
import type { CreateTagDTO, UpdateTagDTO } from '../../src/types';

const tags = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/tags
 * Get all tags for the authenticated user
 */
tags.get('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const tagService = new TagService(c.env.DB);

  try {
    const tagsList = await tagService.getTags(user.uid);
    return c.json({
      success: true,
      data: tagsList,
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tags',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/tags/:id
 * Get a single tag by ID
 */
tags.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const tagId = c.req.param('id');
  const tagService = new TagService(c.env.DB);

  try {
    const tag = await tagService.getTagById(tagId, user.uid);
    
    if (!tag) {
      return c.json(
        {
          success: false,
          error: 'Tag not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    console.error('Error fetching tag:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tag',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/tags
 * Create a new tag
 */
tags.post('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const data: CreateTagDTO = await c.req.json();
    
    // Validate required fields
    if (!data.name) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Tag name is required',
        },
        400
      );
    }

    const tagService = new TagService(c.env.DB);
    const tag = await tagService.createTag(user.uid, data);

    return c.json(
      {
        success: true,
        data: tag,
        message: 'Tag created successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating tag:', error);
    
    if (error.message === 'Tag with this name already exists') {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: error.message,
        },
        400
      );
    }
    
    return c.json(
      {
        success: false,
        error: 'Failed to create tag',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PATCH /api/tags/:id
 * Update a tag
 */
tags.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const tagId = c.req.param('id');

  try {
    const data: UpdateTagDTO = await c.req.json();
    const tagService = new TagService(c.env.DB);
    
    const tag = await tagService.updateTag(tagId, user.uid, data);
    
    if (!tag) {
      return c.json(
        {
          success: false,
          error: 'Tag not found or no permission',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: tag,
      message: 'Tag updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    
    if (
      error.message === 'Tag not found or no permission' ||
      error.message === 'Tag with this name already exists'
    ) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: error.message,
        },
        400
      );
    }
    
    return c.json(
      {
        success: false,
        error: 'Failed to update tag',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
tags.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const tagId = c.req.param('id');
  const tagService = new TagService(c.env.DB);

  try {
    const success = await tagService.deleteTag(tagId, user.uid);
    
    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Tag not found or no permission',
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete tag',
        message: error.message,
      },
      500
    );
  }
});

export default tags;



