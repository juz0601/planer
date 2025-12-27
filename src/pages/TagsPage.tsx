import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getTags, createTag, updateTag, deleteTag, getTasks } from '../utils/api';
import type { Tag, CreateTagDTO, UpdateTagDTO, Task } from '../types';

export const TagsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tasksByTag, setTasksByTag] = useState<Record<string, Task[]>>({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#1976d2');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);
      const tagsData = await getTags();
      setTags(tagsData);
      
      // Load tasks for each tag
      const tasksMap: Record<string, Task[]> = {};
      for (const tag of tagsData) {
        try {
          const tasks = await getTasks({ tags: [tag.id], include_archived: false });
          tasksMap[tag.id] = tasks;
        } catch (err) {
          console.error(`Error loading tasks for tag ${tag.id}:`, err);
          tasksMap[tag.id] = [];
        }
      }
      setTasksByTag(tasksMap);
    } catch (err: any) {
      console.error('Error loading tags:', err);
      setError(err.message || 'Не удалось загрузить теги');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color);
    } else {
      setEditingTag(null);
      setTagName('');
      setTagColor('#1976d2');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTag(null);
    setTagName('');
    setTagColor('#1976d2');
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      setError('Название тега обязательно');
      return;
    }

    try {
      setError(null);
      if (editingTag) {
        const updateData: UpdateTagDTO = {
          name: tagName.trim(),
          color: tagColor,
        };
        await updateTag(editingTag.id, updateData);
      } else {
        const createData: CreateTagDTO = {
          name: tagName.trim(),
          color: tagColor,
        };
        await createTag(createData);
      }
      handleCloseDialog();
      await loadTags();
    } catch (err: any) {
      console.error('Error saving tag:', err);
      setError(err.message || 'Не удалось сохранить тег');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, tagId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTagId(tagId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTagId(null);
  };

  const handleEdit = () => {
    if (selectedTagId) {
      const tag = tags.find(t => t.id === selectedTagId);
      if (tag) {
        handleOpenDialog(tag);
      }
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedTagId) return;
    
    if (!confirm('Вы уверены, что хотите удалить этот тег? Это удалит тег из всех задач.')) {
      handleMenuClose();
      return;
    }

    try {
      await deleteTag(selectedTagId);
      await loadTags();
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      setError(err.message || 'Не удалось удалить тег');
    } finally {
      handleMenuClose();
    }
  };

  const handleViewTasks = (tagId: string) => {
    navigate(`/tasks?tags=${tagId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={600}>
          Управление тегами
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Создать тег
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {tags.length === 0 ? (
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <LabelIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Тегов пока нет
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Создайте свой первый тег для организации задач
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Создать тег
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {tags.map((tag) => (
            <Grid item xs={12} sm={6} md={4} key={tag.id}>
              <Card
                elevation={2}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    elevation: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => handleViewTasks(tag.id)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flexGrow={1}>
                      <Chip
                        label={tag.name}
                        sx={{
                          bgcolor: tag.color,
                          color: 'white',
                          fontWeight: 600,
                          mb: 2,
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Задач: {tasksByTag[tag.id]?.length || 0}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, tag.id)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTag ? 'Редактировать тег' : 'Создать тег'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Название тега"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Цвет
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {[
                  '#1976d2', '#dc004e', '#9c27b0', '#673ab7',
                  '#3f51b5', '#2196f3', '#00bcd4', '#009688',
                  '#4caf50', '#8bc34a', '#ffeb3b', '#ffc107',
                  '#ff9800', '#ff5722', '#795548', '#607d8b',
                ].map((color) => (
                  <Box
                    key={color}
                    onClick={() => setTagColor(color)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: color,
                      cursor: 'pointer',
                      border: tagColor === color ? '3px solid' : '1px solid',
                      borderColor: tagColor === color ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                    }}
                  />
                ))}
              </Stack>
              <TextField
                label="HEX код цвета"
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                fullWidth
                sx={{ mt: 2 }}
                inputProps={{ pattern: '^#[0-9A-Fa-f]{6}$' }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSaveTag} variant="contained">
            {editingTag ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>
    </Container>
  );
};

