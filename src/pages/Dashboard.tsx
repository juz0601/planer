import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Fab,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add as AddIcon, CheckCircle, Schedule, Share } from '@mui/icons-material';
import { getTasks } from '../utils/api';
import type { Task } from '../types';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      
      // Load today's tasks
      const todayData = await getTasks({
        date: today,
        include_archived: false,
      });
      setTodayTasks(todayData);

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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight={600} sx={{ mb: 4 }}>
        Главная
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
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

