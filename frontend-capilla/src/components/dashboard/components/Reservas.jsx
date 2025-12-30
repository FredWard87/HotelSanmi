import React, { useEffect, useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Stack,
  Box,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';

import dayjs from 'dayjs';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LocalHotelIcon from '@mui/icons-material/LocalHotel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function Reservas() {
  const [rooms, setRooms] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [openNew, setOpenNew] = useState(false);
  const [origin, setOrigin] = useState('RECEPCION');
  const [clienteName, setClienteName] = useState('');
  const [clienteLastName, setClienteLastName] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clientePhone, setClientePhone] = useState('');
  const [habitacionId, setHabitacionId] = useState('');
  const [fechaIn, setFechaIn] = useState('');
  const [fechaOut, setFechaOut] = useState('');
  const [useCalendar, setUseCalendar] = useState(false);
  const [range, setRange] = useState([null, null]);

  const [snack, setSnack] = useState({ open: false, severity: 'info', message: '' });

  // Cargar datos iniciales
  useEffect(() => {
    fetchRooms();
    fetchReservas();
    fetchBlocks();
  }, []);

  // Inicializar fechas cuando se abre el diálogo
  useEffect(() => {
    if (openNew) {
      const today = dayjs().add(1, 'day');
      const tomorrow = today.add(1, 'day');
      setFechaIn(today.format('YYYY-MM-DD'));
      setFechaOut(tomorrow.format('YYYY-MM-DD'));
      setRange([today, tomorrow]);
    }
  }, [openNew]);

  async function fetchRooms() {
    try {
      const response = await fetch(`${API_URL}/api/rooms/admin`);
      if (!response.ok) throw new Error('Error al cargar habitaciones');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      console.error('Error al cargar habitaciones:', err);
      setError('No se pudieron cargar las habitaciones');
    }
  }

  async function fetchReservas() {
    try {
      const response = await fetch(`${API_URL}/api/bookings`);
      if (!response.ok) throw new Error('Error al cargar reservas');
      const data = await response.json();
      setReservas(data);
    } catch (err) {
      console.error('Error al cargar reservas:', err);
    }
  }

  async function fetchBlocks() {
    try {
      const response = await fetch(`${API_URL}/api/room-blocks`);
      if (!response.ok) throw new Error('Error al cargar bloqueos');
      const data = await response.json();
      setBlocks(data);
    } catch (err) {
      console.error('Error al cargar bloqueos:', err);
    }
  }

  // Calcular noches
  const nights = useMemo(() => {
    if (!fechaIn || !fechaOut) return 0;
    const a = dayjs(fechaIn);
    const b = dayjs(fechaOut);
    const diff = b.diff(a, 'day');
    return Math.max(0, diff);
  }, [fechaIn, fechaOut]);

  // Calcular monto total
  const monto = useMemo(() => {
    if (!habitacionId || nights <= 0) return 0;
    const room = rooms.find(r => r._id === habitacionId);
    if (!room) return 0;
    const subtotal = room.price * nights;
    const tax = subtotal * 0.16;
    return subtotal + tax;
  }, [habitacionId, nights, rooms]);

  // Obtener fechas no disponibles para una habitación
  function getUnavailableDates(roomId) {
    if (!roomId) return [];
    
    const unavailableDates = new Set();

    // Agregar bloqueos
    blocks.forEach(block => {
      const blockRoomId = block.roomId?._id || block.roomId;
      if (blockRoomId === roomId && block.active) {
        let current = dayjs(block.startDate);
        const end = dayjs(block.endDate);
        while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
          unavailableDates.add(current.format('YYYY-MM-DD'));
          current = current.add(1, 'day');
        }
      }
    });

    // Agregar reservas activas
    reservas.forEach(reserva => {
      const resRoomId = reserva.roomId?._id || reserva.roomId;
      if (resRoomId === roomId && reserva.status === 'active') {
        let current = dayjs(reserva.checkIn);
        const end = dayjs(reserva.checkOut);
        while (current.isBefore(end, 'day')) {
          unavailableDates.add(current.format('YYYY-MM-DD'));
          current = current.add(1, 'day');
        }
      }
    });

    return Array.from(unavailableDates);
  }

  function isDayUnavailable(day, roomId) {
    if (!roomId) return false;
    const unavailableDates = getUnavailableDates(roomId);
    return unavailableDates.includes(day.format('YYYY-MM-DD'));
  }

  function isInRange(day, start, end) {
    if (!start || !end) return false;
    return (day.isAfter(start, 'day') || day.isSame(start, 'day')) &&
           (day.isBefore(end, 'day') || day.isSame(end, 'day'));
  }

  function isStartOrEnd(day, start, end) {
    if (!start || !end) return false;
    return day.isSame(start, 'day') || day.isSame(end, 'day');
  }

  function handleCalendarDayClick(day) {
    if (!habitacionId) {
      setSnack({ 
        open: true, 
        severity: 'error', 
        message: 'Seleccione una habitación primero' 
      });
      return;
    }

    if (isDayUnavailable(day, habitacionId)) {
      setSnack({ 
        open: true, 
        severity: 'error', 
        message: 'Fecha no disponible' 
      });
      return;
    }

    if (!range[0] || (range[0] && range[1])) {
      setRange([day, null]);
      setFechaIn(day.format('YYYY-MM-DD'));
      setFechaOut('');
    } else {
      const start = range[0];
      
      if (day.isBefore(start, 'day')) {
        setSnack({ 
          open: true, 
          severity: 'error', 
          message: 'Check-out debe ser después del check-in' 
        });
        return;
      }

      // Verificar fechas intermedias
      let current = start.add(1, 'day');
      const unavailableDates = getUnavailableDates(habitacionId);
      
      while (current.isBefore(day, 'day')) {
        if (unavailableDates.includes(current.format('YYYY-MM-DD'))) {
          setSnack({ 
            open: true, 
            severity: 'error', 
            message: 'Hay fechas no disponibles en el rango' 
          });
          return;
        }
        current = current.add(1, 'day');
      }

      setRange([start, day]);
      setFechaIn(start.format('YYYY-MM-DD'));
      setFechaOut(day.format('YYYY-MM-DD'));
    }
  }

  // Verificar disponibilidad en tiempo real
  const checkAvailability = async (roomId, checkIn, checkOut) => {
    if (!roomId || !checkIn || !checkOut) return null;
    
    try {
      const response = await fetch(
        `${API_URL}/api/bookings/availability?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`
      );
      
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error verificando disponibilidad:', err);
      return null;
    }
  };

  const [availabilityData, setAvailabilityData] = useState(null);

  useEffect(() => {
    if (habitacionId && fechaIn && fechaOut) {
      checkAvailability(habitacionId, fechaIn, fechaOut).then(data => {
        setAvailabilityData(data);
      });
    }
  }, [habitacionId, fechaIn, fechaOut]);

  async function handleCreateReservation(e) {
    e.preventDefault();
    
    if (!habitacionId || !fechaIn || !fechaOut) {
      setSnack({ open: true, severity: 'error', message: 'Complete todos los campos' });
      return;
    }

    if (dayjs(fechaOut).isBefore(dayjs(fechaIn))) {
      setSnack({ open: true, severity: 'error', message: 'Fechas inválidas' });
      return;
    }

    if (!clienteName || !clienteEmail) {
      setSnack({ open: true, severity: 'error', message: 'Complete información del cliente' });
      return;
    }

    // Verificar disponibilidad antes de crear
    const availability = await checkAvailability(habitacionId, fechaIn, fechaOut);
    if (!availability || !availability.isAvailable) {
      setSnack({ 
        open: true, 
        severity: 'error', 
        message: 'No hay disponibilidad para las fechas seleccionadas' 
      });
      return;
    }

    setLoading(true);
    
    try {
      const room = rooms.find(r => r._id === habitacionId);
      
      const bookingData = {
        roomId: habitacionId,
        roomName: room.name,
        guestInfo: {
          firstName: clienteName,
          lastName: clienteLastName || '',
          email: clienteEmail,
          phone: clientePhone || '',
          specialRequests: `Reserva creada por ${origin}`,
        },
        checkIn: fechaIn,
        checkOut: fechaOut,
        nights: nights,
        pricePerNight: room.price,
        // Como es reserva interna, no hay pago por Stripe
        paymentIntentId: null,
      };

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear reserva');
      }

      setSnack({ 
        open: true, 
        severity: 'success', 
        message: `✅ Reserva creada: ${result.bookingId}` 
      });
      
      setOpenNew(false);
      await fetchReservas();
      resetForm();
    } catch (err) {
      console.error('Error al crear reserva:', err);
      setSnack({ 
        open: true, 
        severity: 'error', 
        message: err.message || 'Error al crear reserva' 
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setClienteName('');
    setClienteLastName('');
    setClienteEmail('');
    setClientePhone('');
    setHabitacionId('');
    setFechaIn('');
    setFechaOut('');
    setUseCalendar(false);
    setRange([null, null]);
    setAvailabilityData(null);
  }

  function chipColorForStatus(status) {
    if (status === 'cancelled') return 'error';
    if (status === 'active') return 'success';
    return 'default';
  }

  function chipColorForPayment(paymentStatus) {
    if (paymentStatus === 'completed') return 'success';
    if (paymentStatus === 'partial') return 'warning';
    return 'default';
  }

  function formatDate(date) {
    if (!date) return '—';
    return dayjs(date).format('DD/MM/YYYY');
  }

  function availabilityLabelForRoom(r) {
    if (!fechaIn || !fechaOut) {
      return `Total: ${r.totalUnits}`;
    }
    
    // Si es la habitación seleccionada y tenemos datos de disponibilidad
    if (habitacionId === r._id && availabilityData) {
      return `Disponibles: ${availabilityData.availableUnits}/${r.totalUnits}`;
    }
    
    return `Total: ${r.totalUnits}`;
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <LocalHotelIcon />
        <Typography variant="h6">Panel para personal — Reservas internas</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography sx={{ mb: 2 }}>
        Registrar reservas realizadas por teléfono, WhatsApp o recepción. 
        El sistema verifica disponibilidad automáticamente.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button 
          startIcon={<PhoneIcon />} 
          variant="contained" 
          onClick={() => { 
            setOrigin('TELEFONO'); 
            setOpenNew(true); 
          }}
        >
          Reservar (Teléfono)
        </Button>
        <Button 
          startIcon={<WhatsAppIcon />} 
          variant="contained" 
          color="success"
          onClick={() => { 
            setOrigin('WHATSAPP'); 
            setOpenNew(true); 
          }}
        >
          Reservar (WhatsApp)
        </Button>
        <Button 
          startIcon={<LocalHotelIcon />} 
          variant="contained" 
          color="secondary"
          onClick={() => { 
            setOrigin('RECEPCION'); 
            setOpenNew(true); 
          }}
        >
          Reservar (Recepción)
        </Button>
      </Box>

      {/* Lista de reservas recientes */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Reservas recientes
        </Typography>
        
        {loading && !openNew ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID Reserva</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Habitación</TableCell>
                  <TableCell>Fechas</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Pago</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No hay reservas registradas
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  reservas.slice(0, 20).map(r => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {r.bookingId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {r.guestInfo?.firstName} {r.guestInfo?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.guestInfo?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.roomName}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(r.checkIn)} → {formatDate(r.checkOut)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {r.nights} {r.nights === 1 ? 'noche' : 'noches'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        ${r.totalPrice?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={r.paymentStatus} 
                          size="small"
                          color={chipColorForPayment(r.paymentStatus)} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={r.status} 
                          size="small"
                          color={chipColorForStatus(r.status)} 
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dialog crear reserva */}
      <Dialog 
        open={openNew} 
        onClose={() => {
          setOpenNew(false);
          resetForm();
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {origin === 'TELEFONO' && <PhoneIcon />}
            {origin === 'WHATSAPP' && <WhatsAppIcon />}
            {origin === 'RECEPCION' && <LocalHotelIcon />}
            <Typography>Crear reserva interna ({origin})</Typography>
          </Stack>
        </DialogTitle>
        
        <Box component="form" onSubmit={handleCreateReservation}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction="row" spacing={2}>
              <TextField 
                label="Nombre" 
                value={clienteName} 
                onChange={e => setClienteName(e.target.value)} 
                required 
                fullWidth
              />
              <TextField 
                label="Apellido" 
                value={clienteLastName} 
                onChange={e => setClienteLastName(e.target.value)} 
                fullWidth
              />
            </Stack>

            <TextField 
              label="Email" 
              value={clienteEmail} 
              onChange={e => setClienteEmail(e.target.value)} 
              type="email"
              required
              fullWidth
            />
            
            <TextField 
              label="Teléfono" 
              value={clientePhone} 
              onChange={e => setClientePhone(e.target.value)} 
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Habitación</InputLabel>
              <Select 
                value={habitacionId} 
                label="Habitación" 
                onChange={e => {
                  setHabitacionId(e.target.value);
                  if (useCalendar) {
                    const today = dayjs().add(1, 'day');
                    const tomorrow = today.add(1, 'day');
                    setRange([today, tomorrow]);
                    setFechaIn(today.format('YYYY-MM-DD'));
                    setFechaOut(tomorrow.format('YYYY-MM-DD'));
                  }
                }}
                required
              >
                {rooms.map(r => (
                  <MenuItem key={r._id} value={r._id}>
                    {r.name} — {r.type} ({availabilityLabelForRoom(r)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch 
                  checked={useCalendar} 
                  onChange={(e) => {
                    setUseCalendar(e.target.checked);
                    if (e.target.checked && habitacionId) {
                      const today = dayjs().add(1, 'day');
                      const tomorrow = today.add(1, 'day');
                      setRange([today, tomorrow]);
                      setFechaIn(today.format('YYYY-MM-DD'));
                      setFechaOut(tomorrow.format('YYYY-MM-DD'));
                    }
                  }} 
                />
              }
              label="Usar calendario visual"
            />

            {useCalendar ? (
              <>
                <Typography variant="subtitle2">
                  Fechas: {fechaIn} → {fechaOut || 'Seleccione check-out'}
                </Typography>

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateCalendar
                    value={range[0]}
                    onChange={handleCalendarDayClick}
                    minDate={dayjs().add(1, 'day')}
                    slots={{
                      day: (props) => {
                        const unavailable = isDayUnavailable(props.day, habitacionId);
                        const inRange = isInRange(props.day, range[0], range[1]);
                        const isStartOrEndDay = isStartOrEnd(props.day, range[0], range[1]);

                        return (
                          <PickersDay
                            {...props}
                            disabled={unavailable}
                            sx={{
                              ...(unavailable && {
                                bgcolor: 'error.main',
                                color: 'white',
                              }),
                              ...(inRange && {
                                bgcolor: 'primary.light',
                                color: 'white',
                              }),
                              ...(isStartOrEndDay && {
                                bgcolor: 'primary.main',
                                fontWeight: 'bold',
                              }),
                            }}
                          />
                        );
                      },
                    }}
                  />
                </LocalizationProvider>
              </>
            ) : (
              <Stack direction="row" spacing={2}>
                <TextField 
                  label="Check-in" 
                  type="date" 
                  value={fechaIn} 
                  onChange={e => setFechaIn(e.target.value)} 
                  InputLabelProps={{ shrink: true }} 
                  inputProps={{ min: dayjs().add(1, 'day').format('YYYY-MM-DD') }} 
                  fullWidth
                  required
                />
                <TextField 
                  label="Check-out" 
                  type="date" 
                  value={fechaOut} 
                  onChange={e => setFechaOut(e.target.value)} 
                  InputLabelProps={{ shrink: true }} 
                  inputProps={{ min: fechaIn || dayjs().add(2, 'day').format('YYYY-MM-DD') }} 
                  fullWidth
                  required
                />
              </Stack>
            )}

            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Noches:</strong> {nights}
              </Typography>
              <Typography variant="body2">
                <strong>Precio por noche:</strong> ${rooms.find(r => r._id === habitacionId)?.price || 0}
              </Typography>
              <Typography variant="body2">
                <strong>Total (con IVA):</strong> ${monto.toFixed(2)}
              </Typography>
              {availabilityData && (
                <Typography variant="body2" color={availabilityData.isAvailable ? 'success.main' : 'error.main'}>
                  <strong>Disponibilidad:</strong> {availabilityData.availableUnits} unidades disponibles
                </Typography>
              )}
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => {
              setOpenNew(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading || !habitacionId || !fechaIn || !fechaOut || nights <= 0}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Creando...' : 'Crear reserva'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Paper>
  );
}