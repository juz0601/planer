import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Fab,
  CircularProgress,
  Alert,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Add as AddIcon, CheckCircle, Schedule, Share, Today, ViewWeek, CalendarMonth } from '@mui/icons-material';
import { getTasks } from '../utils/api';
import type { Task } from '../types';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'today' | 'week' | 'month';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [monthTasks, setMonthTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Load today's tasks
      const todayData = await getTasks({
        date: todayStr,
        include_archived: false,
      });
      setTodayTasks(todayData);

      // Load week's tasks
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      const weekData = await getTasks({
        start_date: weekStart.toISOString().split('T')[0],
        end_date: weekEnd.toISOString().split('T')[0],
        include_archived: false,
      });
      setWeekTasks(weekData);

      // Load month's tasks
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const monthData = await getTasks({
        start_date: monthStart.toISOString().split('T')[0],
        end_date: monthEnd.toISOString().split('T')[0],
        include_archived: false,
      });
      setMonthTasks(monthData);

      // Load upcoming tasks (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const upcomingData = await getTasks({
        start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        end_date: nextWeek.toISOString().split('T')[0],
        include_archived: false,
        limit: 5,
      });
      setUpcomingTasks(upcomingData);

      // Load shared tasks
      const sharedData = await getTasks({
        only_shared: true,
        include_archived: false,
        limit: 5,
      });
      setSharedTasks(sharedData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    navigate('/tasks/new');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'planned':
        return 'default';
      default:
        return 'default';
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const getTasksForView = (): Task[] => {
    switch (viewMode) {
      case 'today':
        return todayTasks;
      case 'week':
        return weekTasks;
      case 'month':
        return monthTasks;
      default:
        return todayTasks;
    }
  };

  const getViewTitle = (): string => {
    switch (viewMode) {
      case 'today':
        return 'Задачи на сегодня';
      case 'week':
        return 'Задачи на неделю';
      case 'month':
        return 'Задачи на месяц';
      default:
        return 'Задачи';
    }
  };

  const groupTasksByDate = (tasks: Task[]): Record<string, Task[]> => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach((task) => {
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={600}>
          Главная
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => {
            if (newMode !== null) {
              setViewMode(newMode);
            }
          }}
          aria-label="view mode"
        >
          <ToggleButton value="today" aria-label="today">
            <Today sx={{ mr: 1 }} />
            Сегодня
          </ToggleButton>
          <ToggleButton value="week" aria-label="week">
            <ViewWeek sx={{ mr: 1 }} />
            Неделя
          </ToggleButton>
          <ToggleButton value="month" aria-label="month">
            <CalendarMonth sx={{ mr: 1 }} />
            Месяц
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tasks for selected view */}
      {viewMode !== 'today' && (
        <Card elevation={2} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {getViewTitle()}
            </Typography>
            {getTasksForView().length === 0 ? (
              <Typography color="text.secondary">
                Задач нет
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Object.entries(groupTasksByDate(getTasksForView())).map(([date, dateTasks]) => (
                  <Box key={date}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {date}
                    </Typography>
                    <Stack spacing={1}>
                      {dateTasks.map((task) => (
                        <Box
                          key={task.id}
                          sx={{
                            p: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => navigate(`/tasks/${task.id}`)}
                        >
                          <Typography variant="body1" fontWeight={500}>
                            {task.title}
                          </Typography>
                          <Box display="flex" gap={1} mt={0.5}>
                            <Chip
                              label={task.status}
                              size="small"
                              color={getStatusColor(task.status) as any}
                            />
                            <Chip
                              label={task.priority}
                              size="small"
                              color={getPriorityColor(task.priority) as any}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Today's Tasks Widget */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircle color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Задачи на сегодня
                </Typography>
                <Chip
                  label={todayTasks.length}
                  size="small"
                  color="primary"
                  sx={{ ml: 2 }}
                />
              </Box>

              {todayTasks.length === 0 ? (
                <Typography color="text.secondary">
                  На сегодня задач нет
                </Typography>
              ) : (
                <Box>
                  {todayTasks.slice(0, 5).map((task) => (
                    <Box
                      key={task.id}
                      sx={{
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {task.title}
                      </Typography>
                      <Box display="flex" gap={1} mt={0.5}>
                        <Chip
                          label={task.status}
                          size="small"
                          color={getStatusColor(task.status) as any}
                        />
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Deadlines Widget */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Schedule color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Предстоящие задачи
                </Typography>
              </Box>

              {upcomingTasks.length === 0 ? (
                <Typography color="text.secondary">
                  Предстоящих задач нет
                </Typography>
              ) : (
                <Box>
                  {upcomingTasks.map((task) => (
                    <Box
                      key={task.id}
                      sx={{
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {task.title}
                      </Typography>
                      <Box display="flex" gap={1} mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(task.start_datetime).toLocaleDateString('ru-RU')}
                        </Typography>
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Shared Tasks Widget */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Share color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Расшаренные задачи
                </Typography>
                <Chip
                  label={sharedTasks.length}
                  size="small"
                  color="info"
                  sx={{ ml: 2 }}
                />
              </Box>

              {sharedTasks.length === 0 ? (
                <Typography color="text.secondary">
                  С вами пока никто не поделился задачами
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {sharedTasks.map((task) => (
                    <Grid item xs={12} sm={6} md={4} key={task.id}>
                      <Box
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <Typography variant="body1" fontWeight={500} noWrap>
                          {task.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          От: {task.shared_by_name || task.shared_by}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip
                            label={task.status}
                            size="small"
                            color={getStatusColor(task.status) as any}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FAB for quick add */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{ position: 'fixed', bottom: 80, right: 24 }}
        onClick={handleAddTask}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

