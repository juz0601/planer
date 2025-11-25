import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { TaskService } from '../services/taskService';
import type { CreateTaskDTO, UpdateTaskDTO, TaskFilters } from '../../src/types';

const tasks = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/tasks
 * Get all tasks for the authenticated user with optional filters
 */
tasks.get('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskService = new TaskService(c.env.DB);

  // Parse query parameters
  const filters: TaskFilters = {
    date: c.req.query('date'),
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    status: c.req.query('status') as any,
    priority: c.req.query('priority') as any,
    tags: c.req.query('tags')?.split(','),
    search: c.req.query('search'),
    include_archived: c.req.query('include_archived') === 'true',
    include_shared: c.req.query('include_shared') === 'true',
    only_shared: c.req.query('only_shared') === 'true',
    sort_by: c.req.query('sort_by') as any,
    sort_order: c.req.query('sort_order') as any,
    page: c.req.query('page') ? parseInt(c.req.query('page')!) : undefined,
    limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined,
  };

  try {
    const tasksList = await taskService.getTasks(user.uid, filters);
    return c.json({
      success: true,
      data: tasksList,
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/tasks/:id
 * Get a single task by ID
 */
tasks.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);

  try {
    const task = await taskService.getTaskById(taskId, user.uid);
    
    if (!task) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch task',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
tasks.post('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const data: CreateTaskDTO = await c.req.json();
    
    // Validate required fields
    if (!data.title || !data.start_datetime) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Title and start_datetime are required',
        },
        400
      );
    }

    const taskService = new TaskService(c.env.DB);
    const task = await taskService.createTask(user.uid, data);

    return c.json(
      {
        success: true,
        data: task,
        message: 'Task created successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create task',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PATCH /api/tasks/:id
 * Update a task
 */
tasks.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');

  try {
    const data: UpdateTaskDTO = await c.req.json();
    const taskService = new TaskService(c.env.DB);
    
    const task = await taskService.updateTask(taskId, user.uid, data);
    
    if (!task) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: task,
      message: 'Task updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    
    if (error.message === 'No permission to edit this task') {
      return c.json(
        {
          success: false,
          error: 'Forbidden',
          message: error.message,
        },
        403
      );
    }
    
    return c.json(
      {
        success: false,
        error: 'Failed to update task',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task (hard delete)
 */
tasks.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);

  try {
    const success = await taskService.deleteTask(taskId, user.uid);
    
    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete task',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/tasks/:id/archive
 * Archive a task (soft delete)
 */
tasks.post('/:id/archive', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);

  try {
    const success = await taskService.archiveTask(taskId, user.uid);
    
    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Task archived successfully',
    });
  } catch (error: any) {
    console.error('Error archiving task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to archive task',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/tasks/:id/duplicate
 * Duplicate a task
 */
tasks.post('/:id/duplicate', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);

  try {
    const newTask = await taskService.duplicateTask(taskId, user.uid);
    
    if (!newTask) {
      return c.json(
        {
          success: false,
          error: 'Task not found',
        },
        404
      );
    }

    return c.json(
      {
        success: true,
        data: newTask,
        message: 'Task duplicated successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('Error duplicating task:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to duplicate task',
        message: error.message,
      },
      500
    );
  }
});

export default tasks;



