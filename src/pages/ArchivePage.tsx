import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getTasks, updateTask, deleteTask } from '../utils/api';
import type { Task, TaskStatus, TaskPriority } from '../types';
import { TaskCard } from '../components/tasks/TaskCard';

export const ArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadArchivedTasks();
  }, []);

  const loadArchivedTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const tasksData = await getTasks({
        include_archived: true,
        sort_by: 'updated_at',
        sort_order: 'desc',
      });
      // Filter only archived tasks
      const archivedTasks = tasksData.filter(task => task.is_archived);
      setTasks(archivedTasks);
    } catch (err: any) {
      console.error('Error loading archived tasks:', err);
      setError(err.message || 'Не удалось загрузить архивированные задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (taskId: string) => {
    try {
      await updateTask(taskId, { is_archived: false });
      await loadArchivedTasks();
    } catch (err: any) {
      console.error('Error restoring task:', err);
      alert('Не удалось восстановить задачу');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Вы уверены, что хотите окончательно удалить эту задачу? Это действие нельзя отменить.')) {
      return;
    }

    try {
      await deleteTask(taskId);
      await loadArchivedTasks();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      alert('Не удалось удалить задачу');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, taskId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTaskId(taskId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTaskId(null);
  };

  const handleRestoreFromMenu = () => {
    if (selectedTaskId) {
      handleRestore(selectedTaskId);
    }
    handleMenuClose();
  };

  const handleDeleteFromMenu = () => {
    if (selectedTaskId) {
      handleDelete(selectedTaskId);
    }
    handleMenuClose();
  };

  const groupTasksByDate = (tasksList: Task[]) => {
    const groups: Record<string, Task[]> = {};
    
    tasksList.forEach((task) => {
      const date = new Date(task.updated_at || task.created_at || Date.now()).toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });
    
    return groups;
  };

  const groupedTasks = groupTasksByDate(tasks);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <ArchiveIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Архив задач
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tasks.length} {tasks.length === 1 ? 'задача' : tasks.length < 5 ? 'задачи' : 'задач'} в архиве
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tasks.length === 0 ? (
        <Box textAlign="center" py={8}>
          <ArchiveIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Архив пуст
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Здесь будут отображаться архивированные задачи
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/tasks')}
          >
            Перейти к задачам
          </Button>
        </Box>
      ) : (
        <Stack spacing={4}>
          {Object.entries(groupedTasks).map(([date, dateTasks]) => (
            <Box key={date}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                {date}
              </Typography>
              <Stack spacing={2}>
                {dateTasks.map((task) => (
                  <Box key={task.id} position="relative">
                    <TaskCard
                      task={task}
                      onEdit={(taskId) => navigate(`/tasks/${taskId}/edit`)}
                      onDelete={handleDelete}
                      onArchive={undefined}
                    />
                    <Box
                      position="absolute"
                      top={8}
                      right={8}
                      display="flex"
                      gap={1}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleRestore(task.id)}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        Восстановить
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, task.id)}
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleRestoreFromMenu}>
          <RestoreIcon fontSize="small" sx={{ mr: 1 }} />
          Восстановить
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Удалить навсегда
        </MenuItem>
      </Menu>
    </Container>
  );
};



