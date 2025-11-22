import { useState, useMemo, useEffect } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Modal,
  Avatar,
  Badge,
  Container,
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Switch,
  CircularProgress,
  Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Favorite as FavoriteIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Mail as MailIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Logout as LogoutIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material'
import './App.css'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { Register } from './components/Register'
import { PasswordReset } from './components/PasswordReset'
import { Profile } from './components/Profile'
import { Calendar as CalendarView } from './components/Calendar'

function App() {
  const { user, loading: authLoading, signOut, sendVerificationEmail, getIdToken } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'reset'>('login');
  const [currentView, setCurrentView] = useState<'main' | 'profile' | 'calendar'>('main');

  // Состояние темы: 'light' или 'dark'
  // При первом входе определяем системную тему
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('themeMode')
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode
    }
    // Первый вход - определяем системную тему
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [navigationValue, setNavigationValue] = useState(0)
  const [verificationSent, setVerificationSent] = useState(false)

  // Сохраняем выбор темы в localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
  }, [themeMode])

  // Get and cache ID token when user is authenticated
  useEffect(() => {
    if (user && user.emailVerified) {
      getIdToken();
    }
  }, [user, getIdToken]);

  // Создаем тему
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
  )

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open)
  }

  const handleModalOpen = () => setModalOpen(true)
  const handleModalClose = () => setModalOpen(false)

  const handleThemeToggle = () => {
    setThemeMode((prev) => prev === 'light' ? 'dark' : 'light')
  }

  const getThemeLabel = () => {
    return themeMode === 'dark' ? 'Темная' : 'Светлая'
  }

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

  // Стиль для модального окна (mobile-first)
  const modalStyle = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    p: 4,
  }

  // Show loading spinner while checking auth state
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

  // Show login/register/password-reset if user is not authenticated
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

  // Show email verification required screen
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
                  Verify Your Email
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Please verify your email address to access the application.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  A verification link has been sent to <strong>{user.email}</strong>
                </Typography>

                {verificationSent && (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Verification email sent! Please check your inbox.
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={handleResendVerification}
                  sx={{ mb: 2, py: 1.5 }}
                >
                  Resend Verification Email
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  onClick={handleSignOut}
                  sx={{ py: 1.5 }}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  // Main application (only accessible with verified email)
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* AppBar с Navigation */}
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
          
          {/* Avatar с Badge */}
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

      {/* Drawer */}
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
            {['Главная', 'Планировщик', 'Календарь', 'Настройки'].map((text, index) => {
              const icons = [<HomeIcon />, <DashboardIcon />, <CalendarIcon />, <SettingsIcon />]
              const handleClick = () => {
                if (index === 0) {
                  setCurrentView('main')
                  setNavigationValue(0)
                } else if (index === 2) {
                  setCurrentView('calendar')
                  setNavigationValue(1)
                } else if (index === 3) {
                  setCurrentView('profile')
                  setNavigationValue(2)
                }
                setDrawerOpen(false)
              }
              return (
                <ListItem key={text} disablePadding>
                  <ListItemButton onClick={handleClick}>
                    <ListItemIcon>{icons[index]}</ListItemIcon>
                    <ListItemText primary={text} />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
          <Divider />
          <List>
            <ListItem>
              <ListItemIcon>
                {themeMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
              </ListItemIcon>
              <ListItemText 
                primary="Тема" 
                secondary={getThemeLabel()}
              />
              <Switch
                edge="end"
                onChange={handleThemeToggle}
                checked={themeMode === 'dark'}
                inputProps={{
                  'aria-label': 'переключатель темы',
                }}
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

      {/* Main Content */}
      <Container
        component="main"
        sx={{
          flexGrow: 1,
          py: 3,
          px: { xs: 2, sm: 3 },
          pb: 10, // Отступ для Bottom Navigation
        }}
      >
        {currentView === 'profile' ? (
          <Profile />
        ) : currentView === 'calendar' ? (
          <CalendarView />
        ) : (
          <>
            <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Welcome to Planer!
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              Your email is verified! You now have full access to the application.
            </Alert>

        <Grid container spacing={3}>
          {/* Card Examples */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                  Card 1
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Это пример карточки с возвышением. Отлично работает на мобильных устройствах.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" variant="contained">
                  Действие
                </Button>
                <Button size="small">Подробнее</Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <FavoriteIcon />
                  </Avatar>
                  <Typography variant="h5" component="div">
                    Card 2
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Карточка с иконкой и аватаром. Mobile-first дизайн адаптируется под любой экран.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="secondary">
                  Избранное
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                  Modal Demo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Нажмите кнопку ниже, чтобы открыть модальное окно.
                </Typography>
                <Button variant="outlined" fullWidth onClick={handleModalOpen}>
                  Открыть Modal
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Additional Cards */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={3} sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                  Цветная Card
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Карточка с кастомным фоном для акцента на важной информации.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" sx={{ color: 'white' }}>
                  Узнать больше
                </Button>
              </CardActions>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h5" component="div">
                    Drawer Demo
                  </Typography>
                  <IconButton size="small" onClick={toggleDrawer(true)}>
                    <MenuIcon />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Нажмите на иконку меню или используйте кнопку в AppBar для открытия Drawer.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                  Avatar & Badge
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                  <Badge badgeContent={4} color="primary">
                    <Avatar sx={{ bgcolor: 'primary.main' }}>A</Avatar>
                  </Badge>
                  <Badge badgeContent={10} color="secondary">
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>B</Avatar>
                  </Badge>
                  <Badge badgeContent={99} color="error">
                    <Avatar sx={{ bgcolor: 'error.main' }}>C</Avatar>
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
          </>
        )}
      </Container>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={handleModalClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box sx={modalStyle}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="modal-title" variant="h5" component="h2">
              Модальное окно
            </Typography>
            <IconButton onClick={handleModalClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography id="modal-description" sx={{ mb: 3 }}>
            Это модальное окно адаптировано для мобильных устройств. Оно занимает 90% ширины экрана с максимумом 400px.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={handleModalClose}>Отмена</Button>
            <Button variant="contained" onClick={handleModalClose}>
              ОК
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Bottom Navigation для mobile */}
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
        <BottomNavigation
          showLabels
          value={navigationValue}
          onChange={(_event, newValue) => {
            setNavigationValue(newValue)
            // Switch view based on navigation
            if (newValue === 0) setCurrentView('main')
            if (newValue === 1) setCurrentView('calendar')
            if (newValue === 2) setCurrentView('profile')
          }}
        >
          <BottomNavigationAction label="Главная" icon={<HomeIcon />} />
          <BottomNavigationAction label="Календарь" icon={<CalendarIcon />} />
          <BottomNavigationAction label="Профиль" icon={<PersonIcon />} />
        </BottomNavigation>
      </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App

