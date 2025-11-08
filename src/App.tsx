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
  useMediaQuery,
  Switch,
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
} from '@mui/icons-material'
import './App.css'

function App() {
  // Определяем системную тему
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  
  // Состояние темы: 'light', 'dark', или 'auto'
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    const savedMode = localStorage.getItem('themeMode')
    return (savedMode as 'light' | 'dark' | 'auto') || 'auto'
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [navigationValue, setNavigationValue] = useState(0)

  // Сохраняем выбор темы в localStorage
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
  }, [themeMode])

  // Определяем фактическую тему (с учетом auto режима)
  const actualMode = themeMode === 'auto' 
    ? (prefersDarkMode ? 'dark' : 'light')
    : themeMode

  // Создаем тему
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: actualMode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
        },
      }),
    [actualMode]
  )

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open)
  }

  const handleModalOpen = () => setModalOpen(true)
  const handleModalClose = () => setModalOpen(false)

  const handleThemeToggle = () => {
    setThemeMode((prev) => {
      if (prev === 'auto') return 'light'
      if (prev === 'light') return 'dark'
      return 'auto'
    })
  }

  const getThemeLabel = () => {
    if (themeMode === 'auto') return `Авто (${actualMode === 'dark' ? 'Темная' : 'Светлая'})`
    return themeMode === 'dark' ? 'Темная' : 'Светлая'
  }

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
            MUI Demo
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
              <Avatar alt="User Avatar" sx={{ bgcolor: 'secondary.main' }}>
                U
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
              <Typography variant="h6">Иван Иванов</Typography>
              <Typography variant="body2" color="text.secondary">
                ivan@example.com
              </Typography>
            </Box>
          </Box>
          <Divider />
          <List>
            {['Главная', 'Планировщик', 'Календарь', 'Настройки'].map((text, index) => {
              const icons = [<HomeIcon />, <DashboardIcon />, <CalendarIcon />, <SettingsIcon />]
              return (
                <ListItem key={text} disablePadding>
                  <ListItemButton>
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
                {actualMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
              </ListItemIcon>
              <ListItemText 
                primary="Тема" 
                secondary={getThemeLabel()}
              />
              <Switch
                edge="end"
                onChange={handleThemeToggle}
                checked={themeMode !== 'auto'}
                inputProps={{
                  'aria-label': 'переключатель темы',
                }}
              />
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
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Демонстрация MUI компонентов
        </Typography>

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
          }}
        >
          <BottomNavigationAction label="Главная" icon={<HomeIcon />} />
          <BottomNavigationAction label="Избранное" icon={<FavoriteIcon />} />
          <BottomNavigationAction label="Профиль" icon={<PersonIcon />} />
        </BottomNavigation>
      </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
