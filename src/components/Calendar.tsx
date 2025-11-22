import React, { useState } from 'react';
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
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
} from '@mui/icons-material';

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    setSelectedDate(newDate);
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

      days.push(
        <Grid size={{ xs: 12 / 7 }} key={day}>
          <Paper
            elevation={selected ? 8 : today ? 2 : 0}
            sx={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: selected ? '3px solid' : today ? '2px solid' : '1px solid',
              borderColor: selected ? 'error.main' : today ? 'primary.main' : 'divider',
              bgcolor: selected ? 'error.light' : today ? 'primary.light' : 'background.paper',
              color: selected ? 'error.contrastText' : today ? 'primary.contrastText' : 'text.primary',
              transition: 'all 0.2s',
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
          </Paper>
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
              Calendar
            </Typography>
            <IconButton color="primary" onClick={handleToday}>
              <Today />
            </IconButton>
          </Box>

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
              <Typography variant="body2">Today</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  border: '3px solid',
                  borderColor: 'error.main',
                  bgcolor: 'error.light',
                  borderRadius: 1,
                }}
              />
              <Typography variant="body2">Selected Date</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
