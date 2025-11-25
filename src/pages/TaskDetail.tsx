import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { 
  getTaskById, 
  deleteTask, 
  archiveTask, 
  duplicateTask, 
  getTaskHistory, 
  getRecurrenceRule, 
  getTaskInstances,
  deleteRecurrenceRule,
  generateTaskInstances,
} from '../utils/api';
import type { Task, TaskHistory, RecurrenceRule, TaskInstance } from '../types';

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<TaskHistory[]>([]);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null);
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (id) {
      loadTask();
      loadHistory();
      loadRecurrenceData();
    }
  }, [id]);

  const loadTask = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const taskData = await getTaskById(id);
      setTask(taskData);
    } catch (err: any) {
      console.error('Error loading task:', err);
      setError(err.message || 'Не удалось загрузить задачу');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!id) return;
    
    try {
      const historyData = await getTaskHistory(id);
      setHistory(historyData);
    } catch (err: any) {
      console.error('Error loading history:', err);
    }
  };

  const loadRecurrenceData = async () => {
    if (!id) return;
    
    try {
      const rule = await getRecurrenceRule(id);
      setRecurrenceRule(rule);
      
      if (rule) {
        const instancesData = await getTaskInstances(id);
        setInstances(instancesData);
      }
    } catch (err: any) {
      console.error('Error loading recurrence data:', err);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    navigate(`/tasks/${id}/edit`);
  };

  const handleDelete = async () => {
    handleMenuClose();
    if (!id) return;
    
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    try {
      await deleteTask(id);
      navigate('/tasks');
    } catch (err: any) {
      console.error('Error deleting task:', err);
      alert('Не удалось удалить задачу');
    }
  };

  const handleArchive = async () => {
    handleMenuClose();
    if (!id) return;

    try {
      await archiveTask(id);
      navigate('/tasks');
    } catch (err: any) {
      console.error('Error archiving task:', err);
      alert('Не удалось архивировать задачу');
    }
  };

  const handleDuplicate = async () => {
    handleMenuClose();
    if (!id) return;

    try {
      const newTask = await duplicateTask(id);
      navigate(`/tasks/${newTask.id}`);
    } catch (err: any) {
      console.error('Error duplicating task:', err);
      alert('Не удалось дублировать задачу');
    }
  };

  const handleShare = () => {
    handleMenuClose();
    // TODO: Implement share dialog
    alert('Функция шаринга будет реализована позже');
  };

  const handleGenerateInstances = async () => {
    if (!id) return;
    
    try {
      await generateTaskInstances(id, 30, 90);
      await loadRecurrenceData();
      alert('Инстансы успешно сгенерированы');
    } catch (err: any) {
      console.error('Error generating instances:', err);
      alert('Не удалось сгенерировать инстансы');
    }
  };

  const handleDeleteRecurrence = async () => {
    if (!id) return;
    
    if (!confirm('Вы уверены, что хотите удалить правило повторения? Это не удалит уже созданные инстансы.')) {
      return;
    }

    try {
      await deleteRecurrenceRule(id);
      await loadTask();
      await loadRecurrenceData();
    } catch (err: any) {
      console.error('Error deleting recurrence rule:', err);
      alert('Не удалось удалить правило повторения');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'planned':
        return 'default';
      case 'skipped':
        return 'warning';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planned: 'Запланирована',
      in_progress: 'В работе',
      done: 'Выполнена',
      skipped: 'Пропущена',
      canceled: 'Отменена',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      critical: 'Критический',
    };
    return labels[priority] || priority;
  };

  const DAYS_OF_WEEK = [
    { value: 0, label: 'Понедельник' },
    { value: 1, label: 'Вторник' },
    { value: 2, label: 'Среда' },
    { value: 3, label: 'Четверг' },
    { value: 4, label: 'Пятница' },
    { value: 5, label: 'Суббота' },
    { value: 6, label: 'Воскресенье' },
  ];

  const getRecurrenceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      yearly: 'Ежегодно',
      workdays: 'По рабочим дням',
      weekends: 'По выходным',
      custom: 'Кастомное',
    };
    return labels[type] || type;
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      title: 'Название',
      description: 'Описание',
      start_datetime: 'Дата начала',
      deadline_datetime: 'Дедлайн',
      priority: 'Приоритет',
      status: 'Статус',
      is_archived: 'Архивирование',
      is_recurring: 'Периодичность',
      tags: 'Теги',
    };
    return labels[fieldName] || fieldName;
  };

  const formatValue = (fieldName: string, value: string | null): string => {
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
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !task) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Задача не найдена'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tasks')}>
          Вернуться к списку задач
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/tasks')}
            sx={{ mb: 2 }}
          >
            Назад
          </Button>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {task.title}
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleEdit}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Редактировать
            </MenuItem>
            <MenuItem onClick={handleDuplicate}>
              <CopyIcon fontSize="small" sx={{ mr: 1 }} />
              Дублировать
            </MenuItem>
            {!task.is_shared && (
              <MenuItem onClick={handleShare}>
                <ShareIcon fontSize="small" sx={{ mr: 1 }} />
                Поделиться
              </MenuItem>
            )}
            <MenuItem onClick={handleArchive}>
              <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
              Архивировать
            </MenuItem>
            {!task.is_shared && (
              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Удалить
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      {/* Task Info */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Status and Priority */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip
                label={getStatusLabel(task.status)}
                color={getStatusColor(task.status) as any}
                size="medium"
              />
              <Chip
                label={getPriorityLabel(task.priority)}
                color={getPriorityColor(task.priority) as any}
                size="medium"
              />
              {task.is_recurring && (
                <Chip label="Повторяющаяся" color="info" size="medium" />
              )}
              {task.is_shared && (
                <Chip
                  icon={<ShareIcon />}
                  label={`От: ${task.shared_by_name || task.shared_by}`}
                  variant="outlined"
                  color="info"
                  size="medium"
                />
              )}
            </Box>

            {/* Description */}
            {task.description && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Описание
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {task.description}
                  </Typography>
                </Box>
              </>
            )}

            {/* Dates */}
            <Divider />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Дата начала
              </Typography>
              <Typography variant="body1">
                {new Date(task.start_datetime).toLocaleString('ru-RU', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </Typography>
            </Box>

            {task.deadline_datetime && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Дедлайн
                </Typography>
                <Typography variant="body1">
                  {new Date(task.deadline_datetime).toLocaleString('ru-RU', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </Typography>
              </Box>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Теги
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {task.tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={tag.name}
                        size="small"
                        sx={{
                          bgcolor: tag.color,
                          color: 'white',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            )}

            {/* Metadata */}
            <Divider />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Создана
              </Typography>
              <Typography variant="body2">
                {task.created_at
                  ? new Date(task.created_at).toLocaleString('ru-RU', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })
                  : '—'}
              </Typography>
            </Box>
            {task.updated_at && task.updated_at !== task.created_at && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Обновлена
                </Typography>
                <Typography variant="body2">
                  {new Date(task.updated_at).toLocaleString('ru-RU', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Recurrence Info */}
      {task.is_recurring && recurrenceRule && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                Правило повторения
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleGenerateInstances}
                >
                  Сгенерировать инстансы
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteRecurrence}
                >
                  Удалить правило
                </Button>
              </Box>
            </Box>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Тип
                </Typography>
                <Typography variant="body1">
                  {getRecurrenceTypeLabel(recurrenceRule.type)}
                </Typography>
              </Box>
              {recurrenceRule.interval > 1 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Интервал
                  </Typography>
                  <Typography variant="body1">Каждые {recurrenceRule.interval}</Typography>
                </Box>
              )}
              {recurrenceRule.days_of_week && recurrenceRule.days_of_week.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Дни недели
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {recurrenceRule.days_of_week.map((day: number) => (
                      <Chip
                        key={day}
                        label={DAYS_OF_WEEK.find((d) => d.value === day)?.label || `День ${day}`}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {recurrenceRule.end_type !== 'never' && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Остановка
                  </Typography>
                  <Typography variant="body1">
                    {recurrenceRule.end_type === 'date' && recurrenceRule.end_date
                      ? `До ${new Date(recurrenceRule.end_date).toLocaleDateString('ru-RU')}`
                      : recurrenceRule.end_type === 'count' && recurrenceRule.end_count
                      ? `После ${recurrenceRule.end_count} повторений`
                      : '—'}
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Instances */}
      {task.is_recurring && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                Запланированные повторения {instances.length > 0 && `(${instances.length})`}
              </Typography>
              {instances.length === 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleGenerateInstances}
                >
                  Сгенерировать инстансы
                </Button>
              )}
            </Box>
            {instances.length === 0 ? (
              <Typography color="text.secondary">
                Инстансы еще не сгенерированы. Нажмите кнопку выше для генерации.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ maxHeight: 400, overflow: 'auto' }}>
                {instances.slice(0, 20).map((instance) => (
                  <Paper key={instance.id} elevation={0} sx={{ p: 1.5, bgcolor: 'background.default' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">
                        {new Date(instance.scheduled_date).toLocaleString('ru-RU', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                        {instance.is_modified && (
                          <Chip label="Изменено" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Chip
                        label={getStatusLabel(instance.status)}
                        size="small"
                        color={getStatusColor(instance.status) as any}
                      />
                    </Box>
                  </Paper>
                ))}
                {instances.length > 20 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                    И еще {instances.length - 20} повторений...
                  </Typography>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              История изменений
            </Typography>
            <Stack spacing={2}>
              {history.map((item) => (
                <Paper key={item.id} elevation={0} sx={{ p: 2, bgcolor: 'background.default', borderLeft: '3px solid', borderLeftColor: 'primary.main' }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {getFieldLabel(item.field_name)}
                  </Typography>
                  <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                    <Chip
                      label={`Было: ${formatValue(item.field_name, item.old_value || null)}`}
                      size="small"
                      variant="outlined"
                      color="default"
                    />
                    <Chip
                      label={`Стало: ${formatValue(item.field_name, item.new_value || null)}`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {new Date(item.changed_at).toLocaleString('ru-RU', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                    {item.user && ` • ${item.user.display_name || item.user.email}`}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

