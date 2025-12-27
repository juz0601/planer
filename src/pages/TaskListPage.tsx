import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TaskCard } from '../components/tasks/TaskCard';
import { getTasks, updateTask, deleteTask, archiveTask, duplicateTask, getTags } from '../utils/api';
import type { Task, TaskFilters, TaskStatus, TaskPriority, Tag } from '../types';

export const TaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const tagsParam = searchParams.get('tags');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({
    date: dateParam || undefined,
    tags: tagsParam ? [tagsParam] : undefined,
    include_archived: false,
    sort_by: 'start_datetime',
    sort_order: 'asc',
  });

  useEffect(() => {
    loadTasks();
    loadTags();
  }, [filters]);

  const loadTags = async () => {
    try {
      const tags = await getTags();
      setAvailableTags(tags);
    } catch (err: any) {
      console.error('Error loading tags:', err);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTasks(filters);
      setTasks(data);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: 'done' | 'planned') => {
    try {
      await updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (err: any) {
      console.error('Error updating task status:', err);
      alert('Не удалось обновить статус задачи');
    }
  };

  const handleEdit = (taskId: string) => {
    navigate(`/tasks/${taskId}/edit`);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err: any) {
      console.error('Error deleting task:', err);
      alert('Не удалось удалить задачу');
    }
  };

  const handleDuplicate = async (taskId: string) => {
    try {
      const newTask = await duplicateTask(taskId);
      setTasks((prev) => [newTask, ...prev]);
    } catch (err: any) {
      console.error('Error duplicating task:', err);
      alert('Не удалось дублировать задачу');
    }
  };

  const handleArchive = async (taskId: string) => {
    try {
      await archiveTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err: any) {
      console.error('Error archiving task:', err);
      alert('Не удалось архивировать задачу');
    }
  };

  const handleShare = (_taskId: string) => {
    // TODO: Implement share dialog
    alert('Функция шаринга будет реализована позже');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: event.target.value || undefined }));
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      status: value ? (value as TaskStatus) : undefined,
    }));
  };

  const handlePriorityFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      priority: value ? (value as TaskPriority) : undefined,
    }));
  };

  const handleTagsFilterChange = (_: any, newValue: Tag[]) => {
    setFilters((prev) => ({
      ...prev,
      tags: newValue.length > 0 ? newValue.map(t => t.id) : undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({
      include_archived: false,
      sort_by: 'start_datetime',
      sort_order: 'asc',
    });
  };

  const groupTasksByDate = (tasksList: Task[]) => {
    const groups: Record<string, Task[]> = {};
    
    tasksList.forEach((task) => {
      const date = new Date(task.start_datetime).toLocaleDateString('ru-RU', {
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Задачи
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/tasks/new')}
        >
          Создать задачу
        </Button>
      </Box>

      {/* Filters */}
      <Box mb={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <TextField
            placeholder="Поиск задач..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            select
            label="Статус"
            value={filters.status || ''}
            onChange={handleStatusFilterChange}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="planned">Запланирована</MenuItem>
            <MenuItem value="in_progress">В работе</MenuItem>
            <MenuItem value="done">Выполнена</MenuItem>
            <MenuItem value="skipped">Пропущена</MenuItem>
            <MenuItem value="canceled">Отменена</MenuItem>
          </TextField>

          <TextField
            select
            label="Приоритет"
            value={filters.priority || ''}
            onChange={handlePriorityFilterChange}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Все</MenuItem>
            <MenuItem value="low">Низкий</MenuItem>
            <MenuItem value="medium">Средний</MenuItem>
            <MenuItem value="high">Высокий</MenuItem>
            <MenuItem value="critical">Критический</MenuItem>
          </TextField>

          <Autocomplete
            multiple
            options={availableTags}
            getOptionLabel={(option) => option.name}
            value={availableTags.filter(tag => filters.tags?.includes(tag.id))}
            onChange={handleTagsFilterChange}
            renderInput={(params) => (
              <TextField {...params} label="Теги" size="small" sx={{ minWidth: 200 }} />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  size="small"
                  sx={{
                    bgcolor: option.color,
                    color: 'white',
                  }}
                />
              ))
            }
          />
        </Stack>

        {(filters.search || filters.status || filters.priority || filters.tags) && (
          <Box>
            <Button size="small" onClick={clearFilters} startIcon={<FilterIcon />}>
              Сбросить фильтры
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={60} />
        </Box>
      ) : tasks.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Задач пока нет
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Создайте свою первую задачу
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tasks/new')}
          >
            Создать задачу
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
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onArchive={handleArchive}
                    onShare={handleShare}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Container>
  );
};

