import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import type { Task } from '../../types';
import { useNavigate } from 'react-router-dom';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, newStatus: 'done' | 'planned') => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  onShare?: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onShare,
}) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const newStatus = event.target.checked ? 'done' : 'planned';
    onStatusChange?.(task.id, newStatus);
  };

  const handleCardClick = () => {
    navigate(`/tasks/${task.id}`);
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

  return (
    <Card
      elevation={2}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          elevation: 4,
          transform: 'translateY(-2px)',
        },
        borderLeft: `4px solid`,
        borderLeftColor: `${getPriorityColor(task.priority)}.main`,
      }}
      onClick={handleCardClick}
    >
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Checkbox
            checked={task.status === 'done'}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            sx={{ mt: -1 }}
          />

          <Box flexGrow={1}>
            <Typography
              variant="h6"
              fontWeight={600}
              sx={{
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                color: task.status === 'done' ? 'text.secondary' : 'text.primary',
              }}
            >
              {task.title}
            </Typography>

            {task.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
                noWrap
              >
                {task.description}
              </Typography>
            )}

            <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
              <Chip
                label={getStatusLabel(task.status)}
                size="small"
                color={getStatusColor(task.status) as any}
              />
              <Chip
                label={getPriorityLabel(task.priority)}
                size="small"
                color={getPriorityColor(task.priority) as any}
              />

              {task.tags && task.tags.length > 0 && (
                <>
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
                </>
              )}

              {task.is_shared && (
                <Chip
                  icon={<ShareIcon />}
                  label={`От: ${task.shared_by_name || task.shared_by}`}
                  size="small"
                  variant="outlined"
                  color="info"
                />
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {new Date(task.start_datetime).toLocaleString('ru-RU', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              {task.deadline_datetime && (
                <> • Дедлайн: {new Date(task.deadline_datetime).toLocaleString('ru-RU', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}</>
              )}
            </Typography>
          </Box>

          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>
      </CardContent>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onEdit?.(task.id);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onDuplicate?.(task.id);
          }}
        >
          <CopyIcon fontSize="small" sx={{ mr: 1 }} />
          Дублировать
        </MenuItem>
        {!task.is_shared && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClose();
              onShare?.(task.id);
            }}
          >
            <ShareIcon fontSize="small" sx={{ mr: 1 }} />
            Поделиться
          </MenuItem>
        )}
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleMenuClose();
            onArchive?.(task.id);
          }}
        >
          <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
          Архивировать
        </MenuItem>
        {!task.is_shared && (
          <MenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClose();
              onDelete?.(task.id);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Удалить
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};









