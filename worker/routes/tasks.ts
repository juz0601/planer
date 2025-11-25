import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { TaskService } from '../services/taskService';
import { TaskHistoryService } from '../services/taskHistoryService';
import { RecurrenceService } from '../services/recurrenceService';
import { TaskInstanceService } from '../services/taskInstanceService';
import type { CreateTaskDTO, UpdateTaskDTO, TaskFilters, RecurrenceRule } from '../../src/types';

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

/**
 * GET /api/tasks/:id/history
 * Get task history
 */
tasks.get('/:id/history', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const historyService = new TaskHistoryService(c.env.DB);

  try {
    const history = await historyService.getTaskHistory(taskId, user.uid);
    
    return c.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Error fetching task history:', error);
    
    if (error.message === 'Task not found or no permission') {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }
    
    return c.json(
      {
        success: false,
        error: 'Failed to fetch task history',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/tasks/:id/recurrence
 * Create recurrence rule for a task
 */
tasks.post('/:id/recurrence', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);
  const recurrenceService = new RecurrenceService(c.env.DB);

  try {
    // Check if user owns the task
    const task = await taskService.getTaskById(taskId, user.uid);
    if (!task || task.user_id !== user.uid) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    const ruleData: Omit<RecurrenceRule, 'id' | 'created_at'> = await c.req.json();
    const rule = await recurrenceService.createRule(taskId, ruleData);

    return c.json(
      {
        success: true,
        data: rule,
        message: 'Recurrence rule created successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('Error creating recurrence rule:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create recurrence rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/tasks/:id/recurrence
 * Get recurrence rule for a task
 */
tasks.get('/:id/recurrence', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);
  const recurrenceService = new RecurrenceService(c.env.DB);

  try {
    // Check if user has access to the task
    const task = await taskService.getTaskById(taskId, user.uid);
    if (!task) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    const rule = await recurrenceService.getRuleByTaskId(taskId);
    
    if (!rule) {
      return c.json(
        {
          success: false,
          error: 'Recurrence rule not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    console.error('Error fetching recurrence rule:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch recurrence rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * PUT /api/tasks/:id/recurrence
 * Update recurrence rule for a task
 */
tasks.put('/:id/recurrence', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);
  const recurrenceService = new RecurrenceService(c.env.DB);

  try {
    // Check if user owns the task
    const task = await taskService.getTaskById(taskId, user.uid);
    if (!task || task.user_id !== user.uid) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    const rule = await recurrenceService.getRuleByTaskId(taskId);
    if (!rule) {
      return c.json(
        {
          success: false,
          error: 'Recurrence rule not found',
        },
        404
      );
    }

    const updates: Partial<Omit<RecurrenceRule, 'id' | 'created_at' | 'task_id'>> = await c.req.json();
    const updatedRule = await recurrenceService.updateRule(rule.id, updates);

    return c.json({
      success: true,
      data: updatedRule,
      message: 'Recurrence rule updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating recurrence rule:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to update recurrence rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * DELETE /api/tasks/:id/recurrence
 * Delete recurrence rule for a task
 */
tasks.delete('/:id/recurrence', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const taskService = new TaskService(c.env.DB);
  const recurrenceService = new RecurrenceService(c.env.DB);

  try {
    // Check if user owns the task
    const task = await taskService.getTaskById(taskId, user.uid);
    if (!task || task.user_id !== user.uid) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    const rule = await recurrenceService.getRuleByTaskId(taskId);
    if (!rule) {
      return c.json(
        {
          success: false,
          error: 'Recurrence rule not found',
        },
        404
      );
    }

    await recurrenceService.deleteRule(rule.id, taskId);

    return c.json({
      success: true,
      message: 'Recurrence rule deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting recurrence rule:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to delete recurrence rule',
        message: error.message,
      },
      500
    );
  }
});

/**
 * POST /api/tasks/:id/instances/generate
 * Generate instances for a recurring task
 */
tasks.post('/:id/instances/generate', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const instanceService = new TaskInstanceService(c.env.DB);

  try {
    const maxInstances = c.req.query('max') ? parseInt(c.req.query('max')!) : 30;
    const daysAhead = c.req.query('days') ? parseInt(c.req.query('days')!) : 90;

    const instances = await instanceService.generateInstances(taskId, user.uid, maxInstances, daysAhead);

    return c.json({
      success: true,
      data: instances,
      message: `Generated ${instances.length} instances`,
    });
  } catch (error: any) {
    console.error('Error generating instances:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to generate instances',
        message: error.message,
      },
      500
    );
  }
});

/**
 * GET /api/tasks/:id/instances
 * Get all instances for a task
 */
tasks.get('/:id/instances', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const taskId = c.req.param('id');
  const instanceService = new TaskInstanceService(c.env.DB);
  const taskService = new TaskService(c.env.DB);

  try {
    // Check if user has access to the task
    const task = await taskService.getTaskById(taskId, user.uid);
    if (!task) {
      return c.json(
        {
          success: false,
          error: 'Task not found or no permission',
        },
        404
      );
    }

    const instances = await instanceService.getInstances(taskId);

    return c.json({
      success: true,
      data: instances,
    });
  } catch (error: any) {
    console.error('Error fetching instances:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch instances',
        message: error.message,
      },
      500
    );
  }
});

export default tasks;



