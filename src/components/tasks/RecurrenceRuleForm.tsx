import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  FormGroup,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { RecurrenceRule, RecurrenceType, RecurrenceEndType } from '../../types';

interface RecurrenceRuleFormProps {
  value?: RecurrenceRule | null;
  onChange: (rule: Omit<RecurrenceRule, 'id' | 'created_at'> | null) => void;
}

// Helper to convert RecurrenceRule to form value
const ruleToFormValue = (rule: RecurrenceRule | null): Omit<RecurrenceRule, 'id' | 'created_at'> | null => {
  if (!rule) return null;
  const { id, created_at, ...rest } = rule;
  return rest;
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

export const RecurrenceRuleForm: React.FC<RecurrenceRuleFormProps> = ({ value, onChange }) => {
  const [type, setType] = useState<RecurrenceType>(value?.type || 'daily');
  const [interval, setInterval] = useState<number>(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.days_of_week || []);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(value?.day_of_month);
  const [endType, setEndType] = useState<RecurrenceEndType>(value?.end_type || 'never');
  const [endDate, setEndDate] = useState<Date | null>(
    value?.end_date ? new Date(value.end_date) : null
  );
  const [endCount, setEndCount] = useState<number | undefined>(value?.end_count);

  useEffect(() => {
    const formValue = value ? ruleToFormValue(value) : null;
    
    if (!formValue) {
      // Reset to defaults
      setType('daily');
      setInterval(1);
      setDaysOfWeek([]);
      setDayOfMonth(undefined);
      setEndType('never');
      setEndDate(null);
      setEndCount(undefined);
      onChange(null);
      return;
    }

    setType(formValue.type);
    setInterval(formValue.interval);
    setDaysOfWeek(formValue.days_of_week || []);
    setDayOfMonth(formValue.day_of_month);
    setEndType(formValue.end_type);
    setEndDate(formValue.end_date ? new Date(formValue.end_date) : null);
    setEndCount(formValue.end_count);
  }, [value]);

  useEffect(() => {
    // Build rule object and notify parent
    const rule: Omit<RecurrenceRule, 'id' | 'created_at'> = {
      type,
      interval,
      days_of_week: type === 'weekly' ? daysOfWeek : undefined,
      day_of_month: type === 'monthly' ? dayOfMonth : undefined,
      end_type: endType,
      end_date: endType === 'date' && endDate ? endDate.toISOString() : undefined,
      end_count: endType === 'count' ? endCount : undefined,
    };

    onChange(rule);
  }, [type, interval, daysOfWeek, dayOfMonth, endType, endDate, endCount, onChange]);

  const handleDayToggle = (day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  return (
    <Stack spacing={3}>
      {/* Recurrence Type */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Тип повторения</FormLabel>
        <RadioGroup value={type} onChange={(e) => setType(e.target.value as RecurrenceType)}>
          <FormControlLabel value="daily" control={<Radio />} label="Ежедневно" />
          <FormControlLabel value="weekly" control={<Radio />} label="Еженедельно" />
          <FormControlLabel value="monthly" control={<Radio />} label="Ежемесячно" />
          <FormControlLabel value="yearly" control={<Radio />} label="Ежегодно" />
          <FormControlLabel value="workdays" control={<Radio />} label="По рабочим дням (пн-пт)" />
          <FormControlLabel value="weekends" control={<Radio />} label="По выходным (сб-вс)" />
          <FormControlLabel value="custom" control={<Radio />} label="Кастомное" />
        </RadioGroup>
      </FormControl>

      {/* Interval */}
      {(type === 'daily' || type === 'weekly' || type === 'monthly' || type === 'yearly' || type === 'custom') && (
        <TextField
          label="Интервал"
          type="number"
          value={interval}
          onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
          inputProps={{ min: 1 }}
          helperText={
            type === 'daily'
              ? 'Каждые N дней'
              : type === 'weekly'
              ? 'Каждые N недель'
              : type === 'monthly'
              ? 'Каждые N месяцев'
              : type === 'yearly'
              ? 'Каждые N лет'
              : 'Кастомный интервал'
          }
        />
      )}

      {/* Days of Week (for weekly) */}
      {type === 'weekly' && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Дни недели
          </Typography>
          <FormGroup>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {DAYS_OF_WEEK.map((day) => (
                <FormControlLabel
                  key={day.value}
                  control={
                    <Checkbox
                      checked={daysOfWeek.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                    />
                  }
                  label={day.label}
                />
              ))}
            </Box>
          </FormGroup>
          {daysOfWeek.length === 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Выберите хотя бы один день недели
            </Alert>
          )}
        </Box>
      )}

      {/* Day of Month (for monthly) */}
      {type === 'monthly' && (
        <TextField
          label="День месяца"
          type="number"
          value={dayOfMonth || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setDayOfMonth(val >= 1 && val <= 31 ? val : undefined);
          }}
          inputProps={{ min: 1, max: 31 }}
          helperText="Число от 1 до 31"
        />
      )}

      {/* End Type */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Остановка повторений</FormLabel>
        <RadioGroup value={endType} onChange={(e) => setEndType(e.target.value as RecurrenceEndType)}>
          <FormControlLabel value="never" control={<Radio />} label="Никогда (бессрочно)" />
          <FormControlLabel value="date" control={<Radio />} label="До определённой даты" />
          <FormControlLabel value="count" control={<Radio />} label="До количества повторений" />
        </RadioGroup>
      </FormControl>

      {/* End Date */}
      {endType === 'date' && (
        <DateTimePicker
          label="Дата окончания"
          value={endDate}
          onChange={(newValue) => setEndDate(newValue)}
          slotProps={{
            textField: {
              fullWidth: true,
            },
          }}
        />
      )}

      {/* End Count */}
      {endType === 'count' && (
        <TextField
          label="Количество повторений"
          type="number"
          value={endCount || ''}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setEndCount(val >= 1 ? val : undefined);
          }}
          inputProps={{ min: 1 }}
          helperText="Число повторений (минимум 1)"
        />
      )}
    </Stack>
  );
};

