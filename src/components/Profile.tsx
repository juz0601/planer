import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Avatar,
  IconButton,
  InputAdornment,
  Grid,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  PhotoCamera,
  Edit,
  Save,
  Cancel,
  Instagram,
  Telegram,
  Twitter,
  LinkedIn,
  GitHub,
  Facebook,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [previewURL, setPreviewURL] = useState(user?.photoURL || '');

  // Social media links
  const [instagram, setInstagram] = useState('');
  const [telegram, setTelegram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [facebook, setFacebook] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (PNG, JPG, JPEG, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewURL(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleAvatarClick = () => {
    if (editMode) {
      fileInputRef.current?.click();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // TODO: Implement actual profile update with Firebase
      // For now, just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setDisplayName(user?.displayName || '');
    setPreviewURL(user?.photoURL || '');
    setError('');
  };

  const socialMediaLinks = [
    { icon: <Instagram />, label: 'Instagram', value: instagram, setter: setInstagram, color: '#E4405F' },
    { icon: <Telegram />, label: 'Telegram', value: telegram, setter: setTelegram, color: '#0088cc' },
    { icon: <Twitter />, label: 'Twitter', value: twitter, setter: setTwitter, color: '#1DA1F2' },
    { icon: <LinkedIn />, label: 'LinkedIn', value: linkedin, setter: setLinkedin, color: '#0077B5' },
    { icon: <GitHub />, label: 'GitHub', value: github, setter: setGithub, color: '#333' },
    { icon: <Facebook />, label: 'Facebook', value: facebook, setter: setFacebook, color: '#1877F2' },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="600">
              Profile Settings
            </Typography>
            {!editMode && (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </Button>
            )}
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Avatar Section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={previewURL}
                alt={displayName || user?.email || 'User'}
                sx={{
                  width: 150,
                  height: 150,
                  fontSize: 60,
                  cursor: editMode ? 'pointer' : 'default',
                  border: '4px solid',
                  borderColor: 'primary.main',
                }}
                onClick={handleAvatarClick}
              >
                {!previewURL && (displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </Avatar>
              {editMode && (
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                  onClick={handleAvatarClick}
                >
                  <PhotoCamera />
                </IconButton>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {editMode && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Click to upload photo (PNG, JPG, JPEG, WebP, max 5MB)
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Basic Info */}
          <Typography variant="h6" gutterBottom fontWeight="600">
            Basic Information
          </Typography>

          <Stack spacing={3} sx={{ mb: 4 }}>
            <TextField
              fullWidth
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!editMode || loading}
              placeholder="Enter your display name"
            />

            <TextField
              fullWidth
              label="Email"
              value={user?.email || ''}
              disabled
              helperText="Email cannot be changed"
            />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Account Status
              </Typography>
              <Chip
                label={user?.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                color={user?.emailVerified ? 'success' : 'warning'}
                size="small"
              />
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          {/* Social Media Links */}
          <Typography variant="h6" gutterBottom fontWeight="600">
            Social Media Links
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {socialMediaLinks.map((social) => (
              <Grid size={{ xs: 12, sm: 6 }} key={social.label}>
                <TextField
                  fullWidth
                  label={social.label}
                  value={social.value}
                  onChange={(e) => social.setter(e.target.value)}
                  disabled={!editMode || loading}
                  placeholder={`Your ${social.label} username or URL`}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box sx={{ color: social.color, display: 'flex' }}>
                          {social.icon}
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            ))}
          </Grid>

          {/* Action Buttons */}
          {editMode && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};
