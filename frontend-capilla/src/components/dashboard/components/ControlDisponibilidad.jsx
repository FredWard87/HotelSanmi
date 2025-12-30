import React, { useEffect, useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  IconButton,
  Chip,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';

import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import InfoIcon from '@mui/icons-material/Info';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';


const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BLOCK_TYPES = ['Mantenimiento', 'Reparación', 'Evento', 'Agotada', 'Otro'];

function isoDateOnly(str) {
  if (!str) return '';
  return dayjs(str).format('YYYY-MM-DD');
}

export function ControlDisponibilidad() {
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const [form, setForm] = useState({
    roomId: '',
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    blockType: 'Mantenimiento',
    reason: '',
    blockAll: false,
    quantityBlocked: 1,
  });

  const [range, setRange] = useState([null, null]);

  // Cargar habitaciones y bloqueos
  useEffect(() => {
    fetchRooms();
    fetchBlocks();
  }, []);

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

  async function fetchBlocks() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/room-blocks`);
      if (!response.ok) throw new Error('Error al cargar bloqueos');
      const data = await response.json();
      setBlocks(data);
    } catch (err) {
      console.error('Error al cargar bloqueos:', err);
      setError('No se pudieron cargar los bloqueos');
    } finally {
      setLoading(false);
    }
  }

  // Calcular bloqueos para cada día del mes actual
  const monthBlocks = useMemo(() => {
    const result = {};
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    
    let currentDay = startOfMonth;
    while (currentDay.isBefore(endOfMonth) || currentDay.isSame(endOfMonth, 'day')) {
      const dateStr = currentDay.format('YYYY-MM-DD');
      result[dateStr] = [];
      
      blocks.forEach(block => {
        if (!block.active) return;
        
        const blockStart = dayjs(block.startDate);
        const blockEnd = dayjs(block.endDate);
        
        if (currentDay.isAfter(blockStart.subtract(1, 'day')) && 
            currentDay.isBefore(blockEnd.add(1, 'day'))) {
          
          const room = block.roomId || { name: 'Desconocida', totalUnits: 0, type: '' };
          result[dateStr].push({
            roomName: room.name,
            roomType: room.type,
            blockType: block.blockType,
            reason: block.reason,
            blockAll: block.blockAll,
            quantity: block.blockAll ? 'Todas' : block.quantityBlocked,
            totalRooms: room.totalUnits || 0,
            roomId: block.roomId?._id || block.roomId,
            blockId: block._id,
          });
        }
      });
      
      currentDay = currentDay.add(1, 'day');
    }
    
    return result;
  }, [currentMonth, blocks]);

  // Estadísticas del mes
  const monthStats = useMemo(() => {
    const stats = {
      totalDaysWithBlocks: 0,
      totalBlocks: 0,
      roomsAffected: new Set(),
      mostAffectedRoom: null,
      maxBlocksInDay: 0,
      busiestDay: null,
    };
    
    Object.entries(monthBlocks).forEach(([date, blocksForDate]) => {
      if (blocksForDate.length > 0) {
        stats.totalDaysWithBlocks++;
        stats.totalBlocks += blocksForDate.length;
        
        if (blocksForDate.length > stats.maxBlocksInDay) {
          stats.maxBlocksInDay = blocksForDate.length;
          stats.busiestDay = date;
        }
        
        blocksForDate.forEach(block => {
          stats.roomsAffected.add(block.roomId);
        });
      }
    });
    
    const roomBlockCount = {};
    Object.values(monthBlocks).forEach(blocksForDate => {
      blocksForDate.forEach(block => {
        roomBlockCount[block.roomId] = (roomBlockCount[block.roomId] || 0) + 1;
      });
    });
    
    let maxCount = 0;
    let mostAffectedId = null;
    Object.entries(roomBlockCount).forEach(([roomId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostAffectedId = roomId;
      }
    });
    
    if (mostAffectedId) {
      const room = rooms.find(r => r._id === mostAffectedId);
      stats.mostAffectedRoom = room ? room.name : 'Desconocida';
    }
    
    return stats;
  }, [monthBlocks, rooms]);

  function openCreate() {
    setEditing(null);
    const today = dayjs();
    const tomorrow = today.add(1, 'day');
    
    setForm({
      roomId: rooms[0]?._id || '',
      startDate: today.format('YYYY-MM-DD'),
      endDate: tomorrow.format('YYYY-MM-DD'),
      blockType: 'Mantenimiento',
      reason: '',
      blockAll: false,
      quantityBlocked: 1,
    });
    
    setRange([today, tomorrow]);
    setOpenDialog(true);
  }

  function openEdit(block) {
    setEditing(block);
    const start = dayjs(block.startDate);
    const end = dayjs(block.endDate);
    
    setForm({
      roomId: block.roomId?._id || block.roomId,
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      blockType: block.blockType,
      reason: block.reason || '',
      blockAll: !!block.blockAll,
      quantityBlocked: block.quantityBlocked || 1,
    });
    
    setRange([start, end]);
    setOpenDialog(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar bloqueo?')) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/room-blocks/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Error al eliminar bloqueo');
      
      setSuccess('Bloqueo eliminado exitosamente');
      await fetchBlocks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al eliminar bloqueo:', err);
      setError('No se pudo eliminar el bloqueo');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!form.roomId) {
      setError('Seleccione una habitación');
      return;
    }

    const blockData = {
      roomId: form.roomId,
      startDate: form.startDate,
      endDate: form.endDate,
      blockType: form.blockType,
      reason: form.reason,
      blockAll: form.blockAll,
      quantityBlocked: form.blockAll ? null : Number(form.quantityBlocked),
    };

    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (editing) {
        response = await fetch(`${API_URL}/api/room-blocks/${editing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blockData),
        });
      } else {
        response = await fetch(`${API_URL}/api/room-blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blockData),
        });
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Error al guardar bloqueo');
      }

      setSuccess(editing ? 'Bloqueo actualizado exitosamente' : 'Bloqueo creado exitosamente');
      setOpenDialog(false);
      await fetchBlocks();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al guardar bloqueo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getBlockedDates(roomId) {
    if (!roomId) return [];
    const roomBlocks = blocks.filter(b => 
      b.active && 
      (b.roomId?._id === roomId || b.roomId === roomId)
    );
    
    const blockedDates = new Set();
    roomBlocks.forEach(block => {
      let current = dayjs(block.startDate);
      const end = dayjs(block.endDate);
      while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
        blockedDates.add(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
      }
    });
    return Array.from(blockedDates);
  }

  function isDayBlocked(day, roomId) {
    if (!roomId) return false;
    const blockedDates = getBlockedDates(roomId);
    return blockedDates.includes(day.format('YYYY-MM-DD'));
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

  function handleRangeSelect(day) {
    if (!form.roomId) {
      alert('Por favor, seleccione una habitación primero');
      return;
    }

    if (isDayBlocked(day, form.roomId)) {
      alert('Esta fecha está bloqueada. Seleccione otra fecha.');
      return;
    }

    if (!range[0] || (range[0] && range[1])) {
      setRange([day, null]);
      setForm(prev => ({
        ...prev,
        startDate: day.format('YYYY-MM-DD'),
        endDate: '',
      }));
    } else {
      const start = range[0];
      
      if (day.isBefore(start, 'day')) {
        alert('La fecha fin debe ser posterior a la fecha inicio');
        return;
      }

      let current = start.add(1, 'day');
      const blockedDates = getBlockedDates(form.roomId);
      let hasBlocked = false;
      
      while (current.isBefore(day, 'day')) {
        if (blockedDates.includes(current.format('YYYY-MM-DD'))) {
          hasBlocked = true;
          break;
        }
        current = current.add(1, 'day');
      }

      if (hasBlocked) {
        alert('Hay fechas bloqueadas dentro del rango seleccionado.');
        return;
      }

      setRange([start, day]);
      setForm(prev => ({
        ...prev,
        startDate: start.format('YYYY-MM-DD'),
        endDate: day.format('YYYY-MM-DD'),
      }));
    }
  }

  const goToPreviousMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'));
  const goToNextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'));
  const goToToday = () => {
    setCurrentMonth(dayjs());
    setSelectedDate(dayjs());
  };

  const getBlockTypeColor = (type) => {
    switch(type) {
      case 'Mantenimiento': return 'error';
      case 'Reparación': return 'warning';
      case 'Evento': return 'info';
      case 'Agotada': return 'default';
      case 'Otro': return 'default';
      default: return 'primary';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <CalendarMonthIcon />
        <Typography variant="h6">Control de disponibilidad</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography>Los bloqueos pueden afectar una cantidad específica o bloquear todas las unidades.</Typography>
        <Button 
          startIcon={<AddIcon />} 
          variant="contained" 
          onClick={openCreate}
          disabled={loading || rooms.length === 0}
        >
          Crear bloqueo
        </Button>
      </Box>

      {/* Calendario visual */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <CalendarMonthIcon />
            </Avatar>
          }
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6">Calendario de Bloqueos</Typography>
              <Chip 
                icon={<InfoIcon />} 
                label={`${currentMonth.format('MMMM YYYY')}`}
                color="primary"
                variant="outlined"
              />
            </Stack>
          }
          subheader="Vista general de todos los bloqueos por fecha"
          action={
            <Stack direction="row" spacing={1}>
              <IconButton onClick={goToPreviousMonth} title="Mes anterior">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton onClick={goToToday} title="Ir a hoy">
                <TodayIcon />
              </IconButton>
              <IconButton onClick={goToNextMonth} title="Mes siguiente">
                <ChevronRightIcon />
              </IconButton>
            </Stack>
          }
        />
        <CardContent>
          {/* Estadísticas */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Días con bloqueos</Typography>
                  <Typography variant="h4">{monthStats.totalDaysWithBlocks}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total bloqueos</Typography>
                  <Typography variant="h4">{monthStats.totalBlocks}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Habitaciones afectadas</Typography>
                  <Typography variant="h4">{monthStats.roomsAffected.size}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Día más ocupado</Typography>
                  <Typography variant="h6">
                    {monthStats.busiestDay ? dayjs(monthStats.busiestDay).format('DD/MM') : 'Ninguno'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <DateCalendar
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
                onMonthChange={(newMonth) => setCurrentMonth(newMonth)}
                slots={{
                  day: (props) => {
                    const dateStr = props.day.format('YYYY-MM-DD');
                    const dayBlocks = monthBlocks[dateStr] || [];
                    const hasBlocks = dayBlocks.length > 0;
                    
                    return (
                      <Tooltip 
                        title={
                          hasBlocks ? (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                {props.day.format('DD/MM/YYYY')}
                              </Typography>
                              {dayBlocks.map((block, idx) => (
                                <Box key={idx} sx={{ py: 0.5 }}>
                                  <Typography variant="caption" fontWeight="bold">
                                    {block.roomName}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    {block.blockType} - {block.quantity}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : 'Sin bloqueos'
                        }
                        arrow
                      >
                        <Box sx={{ position: 'relative' }}>
                          <PickersDay
                            {...props}
                            sx={{
                              ...(hasBlocks && {
                                bgcolor: 'error.light',
                                color: 'error.contrastText',
                                fontWeight: 'bold',
                              }),
                            }}
                          />
                          {hasBlocks && (
                            <Box sx={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              bgcolor: 'error.main',
                              color: 'white',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {dayBlocks.length}
                            </Box>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  },
                }}
              />
            </Box>
          </LocalizationProvider>
        </CardContent>
      </Card>

      {/* Tabla de bloqueos */}
      {loading && !openDialog ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Habitación</TableCell>
                <TableCell>Rango</TableCell>
                <TableCell>Tipo / Motivo</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay bloqueos registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                blocks.map(b => {
                  const room = b.roomId || { name: '—', totalUnits: 0 };
                  return (
                    <TableRow key={b._id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <MeetingRoomIcon fontSize="small" />
                          <Typography>{room.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${isoDateOnly(b.startDate)} → ${isoDateOnly(b.endDate)}`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip 
                            label={b.blockType} 
                            size="small" 
                            color={getBlockTypeColor(b.blockType)}
                          />
                          {b.reason && <Typography variant="caption">{b.reason}</Typography>}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {b.blockAll ? (
                          <Chip label={`Todas (${room.totalUnits})`} color="warning" size="small" />
                        ) : (
                          <Chip label={b.quantityBlocked} size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={b.active ? 'Sí' : 'No'} 
                          color={b.active ? 'success' : 'default'} 
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button 
                            size="small" 
                            startIcon={<EditIcon />} 
                            onClick={() => openEdit(b)}
                            disabled={loading}
                          >
                            Editar
                          </Button>
                          <Button 
                            size="small" 
                            color="error" 
                            startIcon={<DeleteIcon />} 
                            onClick={() => handleDelete(b._id)}
                            disabled={loading}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Editar bloqueo' : 'Crear bloqueo'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Habitación</InputLabel>
              <Select
                value={form.roomId}
                label="Habitación"
                onChange={e => {
                  setForm(prev => ({ ...prev, roomId: e.target.value }));
                  setRange([dayjs(), dayjs().add(1, 'day')]);
                }}
                required
                disabled={loading}
              >
                {rooms.map(r => (
                  <MenuItem key={r._id} value={r._id}>
                    {r.name} — {r.type} (Total: {r.totalUnits})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2">
              Fechas: {form.startDate} → {form.endDate || 'Seleccione fin'}
            </Typography>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={range[0]}
                onChange={handleRangeSelect}
                minDate={dayjs()}
                slots={{
                  day: (props) => {
                    const blocked = isDayBlocked(props.day, form.roomId);
                    const inRange = isInRange(props.day, range[0], range[1]);
                    const isStartOrEndDay = isStartOrEnd(props.day, range[0], range[1]);

                    return (
                      <PickersDay
                        {...props}
                        disabled={blocked}
                        sx={{
                          ...(blocked && {
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

            <FormControl fullWidth>
              <InputLabel>Tipo de bloqueo</InputLabel>
              <Select
                value={form.blockType}
                label="Tipo de bloqueo"
                onChange={e => setForm(prev => ({ ...prev, blockType: e.target.value }))}
                disabled={loading}
              >
                {BLOCK_TYPES.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField 
              label="Motivo" 
              value={form.reason} 
              onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
              multiline
              rows={2}
              disabled={loading}
            />

            <Stack direction="row" alignItems="center" spacing={2}>
              <Switch 
                checked={form.blockAll} 
                onChange={e => setForm(prev => ({ ...prev, blockAll: e.target.checked }))} 
                disabled={loading}
              />
              <Typography>Bloquear todas las unidades</Typography>
            </Stack>

            {!form.blockAll && (
              <TextField 
                label="Cantidad a bloquear" 
                type="number" 
                inputProps={{ min: 1 }} 
                value={form.quantityBlocked} 
                onChange={e => setForm(prev => ({ ...prev, quantityBlocked: Number(e.target.value) }))}
                disabled={loading}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || !form.endDate}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Paper>
  );
}