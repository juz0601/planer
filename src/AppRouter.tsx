import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Switch,
  CircularProgress,
  Alert,
  Container,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Favorite as FavoriteIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Mail as MailIcon,
  Notifications as NotificationsIcon,
  CalendarMonth as CalendarIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Logout as LogoutIcon,
  VerifiedUser as VerifiedUserIcon,
  Label as LabelIcon,
  People as PeopleIcon,
  Share as ShareIcon,
  Task as TaskIcon,
} from '@mui/icons-material';
import './App.css';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { PasswordReset } from './components/PasswordReset';
import { Profile } from './components/Profile';
import { Calendar as CalendarView } from './components/Calendar';
import { Dashboard } from './pages/Dashboard';
import { TaskListPage } from './pages/TaskListPage';
import { TaskDetail } from './pages/TaskDetail';
import { TaskForm } from './components/tasks/TaskForm';

function AppRouter() {
  const { user, loading: authLoading, signOut, sendVerificationEmail, getIdToken } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'reset'>('login');
  
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (user && user.emailVerified) {
      getIdToken();
    }
  }, [user, getIdToken]);

  // Handle authentication expiration
  useEffect(() => {
    const handleAuthExpired = async () => {
      // Clear any cached tokens
      localStorage.removeItem('firebaseToken');
      
      // Sign out user if still logged in
      if (user) {
        try {
          await signOut();
        } catch (error) {
          console.error('Error signing out on auth expiration:', error);
        }
      }
      
      // Switch to login view
      setAuthView('login');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [user, signOut]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
      }),
    [themeMode]
  );

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const handleThemeToggle = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const getThemeLabel = () => {
    return themeMode === 'dark' ? 'Темная' : 'Светлая';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000);
    } catch (error: any) {
      console.error('Error sending verification:', error);
    }
  };

  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {authView === 'login' && (
          <Login
            onSwitchToRegister={() => setAuthView('register')}
            onSwitchToPasswordReset={() => setAuthView('reset')}
          />
        )}
        {authView === 'register' && (
          <Register onSwitchToLogin={() => setAuthView('login')} />
        )}
        {authView === 'reset' && (
          <PasswordReset onBackToLogin={() => setAuthView('login')} />
        )}
      </ThemeProvider>
    );
  }

  if (!user.emailVerified) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 3,
            }}
          >
            <Card elevation={3} sx={{ width: '100%', maxWidth: 500 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <VerifiedUserIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
                <Typography variant="h4" component="h1" gutterBottom fontWeight="600">
                  Подтвердите email
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Пожалуйста, подтвердите ваш email для доступа к приложению.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Ссылка для подтверждения отправлена на <strong>{user.email}</strong>
                </Typography>

                {verificationSent && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Письмо отправлено! Проверьте почту.
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={handleResendVerification}
                  sx={{ mb: 2, py: 1.5 }}
                >
                  Отправить повторно
                </Button>

                <Button fullWidth variant="text" onClick={handleSignOut} sx={{ py: 1.5 }}>
                  Выйти
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="sticky">
            <Toolbar>
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Planer
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <IconButton color="inherit">
                  <Badge badgeContent={4} color="error">
                    <MailIcon />
                  </Badge>
                </IconButton>
                <IconButton color="inherit">
                  <Badge badgeContent={17} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        border: '2px solid white',
                      }}
                    />
                  }
                >
                  <Avatar alt={user.email || 'User'} sx={{ bgcolor: 'secondary.main' }}>
                    {user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
              </Box>
            </Toolbar>
          </AppBar>

          <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
            <Box
              sx={{ width: 280 }}
              role="presentation"
              onClick={toggleDrawer(false)}
              onKeyDown={toggleDrawer(false)}
            >
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{user.email?.split('@')[0] || 'User'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
              </Box>
              <Divider />
              <List>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/">
                    <ListItemIcon>
                      <HomeIcon />
                    </ListItemIcon>
                    <ListItemText primary="Главная" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/tasks">
                    <ListItemIcon>
                      <TaskIcon />
                    </ListItemIcon>
                    <ListItemText primary="Задачи" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/calendar">
                    <ListItemIcon>
                      <CalendarIcon />
                    </ListItemIcon>
                    <ListItemText primary="Календарь" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/tags">
                    <ListItemIcon>
                      <LabelIcon />
                    </ListItemIcon>
                    <ListItemText primary="Теги" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/friends">
                    <ListItemIcon>
                      <PeopleIcon />
                    </ListItemIcon>
                    <ListItemText primary="Друзья" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/shared">
                    <ListItemIcon>
                      <ShareIcon />
                    </ListItemIcon>
                    <ListItemText primary="Расшаренные" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component="a" href="/profile">
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Профиль" />
                  </ListItemButton>
                </ListItem>
              </List>
              <Divider />
              <List>
                <ListItem>
                  <ListItemIcon>
                    {themeMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                  </ListItemIcon>
                  <ListItemText primary="Тема" secondary={getThemeLabel()} />
                  <Switch
                    edge="end"
                    onChange={handleThemeToggle}
                    checked={themeMode === 'dark'}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton onClick={handleSignOut}>
                    <ListItemIcon>
                      <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="Выйти" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          </Drawer>

          <Box component="main" sx={{ flexGrow: 1, pb: 8 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/tasks" element={<TaskListPage />} />
              <Route path="/tasks/new" element={<TaskForm />} />
              <Route path="/tasks/:id/edit" element={<TaskForm />} />
              <Route path="/tasks/:id" element={<TaskDetail />} />
              <Route path="/tags" element={<div>Tags Page (TODO)</div>} />
              <Route path="/friends" element={<div>Friends Page (TODO)</div>} />
              <Route path="/shared" element={<div>Shared Tasks (TODO)</div>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>

          <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
            <BottomNavigation showLabels>
              <BottomNavigationAction
                label="Главная"
                icon={<HomeIcon />}
                component="a"
                href="/"
              />
              <BottomNavigationAction
                label="Избранное"
                icon={<FavoriteIcon />}
              />
              <BottomNavigationAction
                label="Профиль"
                icon={<PersonIcon />}
                component="a"
                href="/profile"
              />
            </BottomNavigation>
          </Box>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default AppRouter;

