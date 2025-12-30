
/* -------------------- theme.js -------------------- */
import { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Paper,
  Button,
  Container,
  Stack,
  ButtonGroup,
} from '@mui/material';

import { AdministracionReservas } from "./components/AdministracionReservas"
import { ControlDisponibilidad } from "./components/ControlDisponibilidad"
import { GestionHabitaciones } from "./components/GestionHabitaciones"
import { Reservas } from "./components/Reservas"
import { LoginForm } from "./Login"
import WeddingsAdmin from "./components/WeddingsAdmin/WeddingsAdmin"

import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

// Tema claro con blanco de fondo, y acento #d4af37
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#d4af37',
      contrastText: '#000',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#333333',
    },
  },
});

/* -------------------- Dashboard.jsx (componente padre) -------------------- */
export default function Dashboard() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }); // {email, role, name}
  const [view, setView] = useState(null); // key: 'gestion','disponibilidad','adminReservas','reservas'

  function handleLogin(u) {
    setUser(u);
    // vista por defecto según rol
    if (u.role === 'admin') setView('gestion');
    else setView('adminReservas');
  }

  function handleLogout() {
    setUser(null);
    setView(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  // items visibles según rol (sin sidebar)
  const adminItems = [
    { key: 'gestion', label: 'Gestión de habitaciones', icon: <MeetingRoomIcon /> },
    { key: 'disponibilidad', label: 'Control de disponibilidad', icon: <CalendarMonthIcon /> },
    { key: 'adminReservas', label: 'Administración de reservas', icon: <ManageAccountsIcon /> },
    { key: 'weddings', label: 'Bodas / Visitas', icon: <CalendarMonthIcon /> },
    { key: 'reservas', label: 'Reservas', icon: <BookOnlineIcon /> },
  ];

  const employeeItems = [
    { key: 'adminReservas', label: 'Administración de reservas', icon: <ManageAccountsIcon /> },
    { key: 'reservas', label: 'Reservas', icon: <BookOnlineIcon /> },
  ];

  const visibleItems = user?.role === 'admin' ? adminItems : employeeItems;

  function renderView() {
    switch (view) {
      case 'gestion':
        return <GestionHabitaciones />;
      case 'weddings':
        return <WeddingsAdmin />;
      case 'disponibilidad':
        return <ControlDisponibilidad />;
      case 'adminReservas':
        return <AdministracionReservas />;
      case 'reservas':
        return <Reservas />;
      default:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5">Bienvenido</Typography>
            <Typography sx={{ mt: 1 }}>{user ? `Hola ${user.name || user.email}. Selecciona una opción.` : 'Por favor inicia sesión.'}</Typography>
          </Paper>
        );
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* <IconButton edge="start" aria-label="menu">
                <MenuIcon />
              </IconButton> */}
              <Typography variant="h6">La Capilla Hotel — Dashboard</Typography>
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {user ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccountCircleIcon />
                  <Typography>{user.name || user.email} ({user.role})</Typography>
                  <Button variant="outlined" startIcon={<LogoutIcon />} onClick={handleLogout}>Cerrar sesión</Button>
                </Stack>
              ) : null}
            </Box>
          </Toolbar>

          {/* Menu horizontal (visible cuando hay usuario) */}
          {user && (
            <Box sx={{ px: 2, py: 1 }}>
              <ButtonGroup variant="text" aria-label="menu horizontal">
                {visibleItems.map(it => (
                  <Button key={it.key} startIcon={it.icon} onClick={() => setView(it.key)} sx={{ textTransform: 'none' }}>
                    {it.label}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
          )}
        </AppBar>

        <Container sx={{ py: 4 }}>
          {!user ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
              <LoginForm onLogin={handleLogin} />
            </Box>
          ) : (
            <Box>
              {renderView()}
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

/* -------------------- Notas -------------------- */
// - El código está organizado en secciones (simulando archivos). Para un proyecto real, separa
//   cada componente en su propio archivo: /src/components/LoginForm.jsx, /src/components/GestionHabitaciones.jsx, etc.
// - Se agregó validación contra los usuarios mock y la contraseña 1234.
// - Se removió el sidebar lateral; ahora hay un menú horizontal debajo del AppBar que muestra solo las opciones permitidas por rol.
// - Íconos de Material UI añadidos para cada opción.
// - Fondo blanco (tema claro) y acento dorado #d4af37.

// Si quieres que ahora:
// 1) separe los componentes en archivos reales y creo un pequeño tree (con exports/imports),
// 2) agregue routing con react-router-dom y protecciones de ruta,
// 3) o guarde la sesión en localStorage,
// dímelo y lo actualizo en el canvas (creo los archivos separados).
