import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Container,
  IconButton,
  Grid,
  Paper,
  Chip,
  Badge,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getTasks } from '../utils/api';
import type { Task } from '../types';

interface DayTasks {
  [day: number]: Task[];
}

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthTasks, setMonthTasks] = useState<DayTasks>({});

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  useEffect(() => {
    loadMonthTasks();
  }, [currentDate]);

  const loadMonthTasks = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const tasks = await getTasks({
        start_date: firstDay.toISOString().split('T')[0],
        end_date: lastDay.toISOString().split('T')[0],
        include_archived: false,
      });

      // Group tasks by day
      const tasksByDay: DayTasks = {};
      tasks.forEach((task) => {
        const taskDate = new Date(task.start_datetime);
        const day = taskDate.getDate();
        if (!tasksByDay[day]) {
          tasksByDay[day] = [];
        }
        tasksByDay[day].push(task);
      });

      setMonthTasks(tasksByDay);
    } catch (error) {
      console.error('Error loading month tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Convert Sunday (0) to 7, and shift Monday to 0
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = newDate.toISOString().split('T')[0];
    navigate(`/tasks?date=${dateStr}`);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const getTaskCountForDay = (day: number): number => {
    return monthTasks[day]?.length || 0;
  };

  const getPriorityDotsForDay = (day: number): JSX.Element[] => {
    const tasks = monthTasks[day] || [];
    const priorities = new Set(tasks.map(t => t.priority));
    
    const priorityColors: Record<string, string> = {
      critical: '#d32f2f',
      high: '#f57c00',
      medium: '#1976d2',
      low: '#757575',
    };

    return Array.from(priorities).slice(0, 3).map((priority, index) => (
      <Box
        key={`${day}-${priority}-${index}`}
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: priorityColors[priority] || '#757575',
        }}
      />
    ));
  };

  const getTooltipContent = (day: number): string => {
    const tasks = monthTasks[day] || [];
    if (tasks.length === 0) return 'Нет задач';
    return `${tasks.length} ${tasks.length === 1 ? 'задача' : tasks.length < 5 ? 'задачи' : 'задач'}`;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <Grid size={{ xs: 12 / 7 }} key={`empty-${i}`}>
          <Box sx={{ aspectRatio: '1', p: 1 }} />
        </Grid>
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const today = isToday(day);
      const selected = isSelected(day);
      const taskCount = getTaskCountForDay(day);

      days.push(
        <Grid size={{ xs: 12 / 7 }} key={day}>
          <Tooltip title={getTooltipContent(day)} arrow>
            <Paper
              elevation={selected ? 8 : today ? 2 : 0}
              sx={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: selected ? '3px solid' : today ? '2px solid' : '1px solid',
                borderColor: selected ? 'error.main' : today ? 'primary.main' : 'divider',
                bgcolor: selected ? 'error.light' : today ? 'primary.light' : 'background.paper',
                color: selected ? 'error.contrastText' : today ? 'primary.contrastText' : 'text.primary',
                transition: 'all 0.2s',
                position: 'relative',
                '&:hover': {
                  bgcolor: selected ? 'error.main' : today ? 'primary.main' : 'action.hover',
                  transform: 'scale(1.05)',
                  boxShadow: 3,
                },
              }}
              onClick={() => handleDateClick(day)}
            >
              <Typography variant="body1" fontWeight={selected || today ? 'bold' : 'normal'}>
                {day}
              </Typography>
              
              {taskCount > 0 && (
                <Box 
                  display="flex" 
                  gap={0.5} 
                  mt={0.5}
                  sx={{ 
                    position: 'absolute', 
                    bottom: 4,
                  }}
                >
                  {getPriorityDotsForDay(day)}
                </Box>
              )}
              
              {taskCount > 3 && (
                <Chip
                  label={taskCount}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    height: 18,
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Paper>
          </Tooltip>
        </Grid>
      );
    }

    return days;
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return 'No date selected';
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="600">
              Календарь
            </Typography>
            <IconButton color="primary" onClick={handleToday}>
              <Today />
            </IconButton>
          </Box>

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Selected Date Display */}
          {selectedDate && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Chip
                label={formatSelectedDate()}
                color="error"
                sx={{ fontSize: '1rem', py: 2, px: 1 }}
              />
            </Box>
          )}

          {/* Month Navigation */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <IconButton onClick={handlePrevMonth} color="primary">
              <ChevronLeft />
            </IconButton>

            <Typography variant="h5" fontWeight="600">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Typography>

            <IconButton onClick={handleNextMonth} color="primary">
              <ChevronRight />
            </IconButton>
          </Box>

          {/* Day Names */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {dayNames.map((day) => (
              <Grid size={{ xs: 12 / 7 }} key={day}>
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 1,
                    fontWeight: 'bold',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {day}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Grid */}
          <Grid container spacing={1}>
            {renderCalendar()}
          </Grid>

          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 4, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  bgcolor: 'primary.light',
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">Сегодня</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2">Приоритеты:</Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#d32f2f', mx: 0.5 }} />
              <Typography variant="caption">Критический</Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f57c00', mx: 0.5 }} />
              <Typography variant="caption">Высокий</Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2', mx: 0.5 }} />
              <Typography variant="caption">Средний</Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#757575', mx: 0.5 }} />
              <Typography variant="caption">Низкий</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
