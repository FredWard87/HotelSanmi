import React, { useEffect, useState } from 'react';
import {
  Typography,
  Paper,
  Stack,
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
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';

import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Inventory2Icon from '@mui/icons-material/Inventory2';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ROOM_TYPES = ['STANDARD', 'SUITE', 'MASTER'];
const LUGARES = ['casaHotel', 'boutique'];

export function GestionHabitaciones({ onRoomsChange }) {
  const [rooms, setRooms] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const emptyForm = {
    name: '',
    type: 'STANDARD',
    size: '',
    price: 0,
    totalUnits: 1,
    capacity: 1,
    bedType: '',
    amenities: [],
    description: '',
    lugar: 'casaHotel',
  };

  const [form, setForm] = useState(emptyForm);

  // Cargar habitaciones desde la API
  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (onRoomsChange) onRoomsChange(rooms);
  }, [rooms, onRoomsChange]);

  async function fetchRooms() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/rooms/admin`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      console.error('Error al cargar habitaciones:', err);
      setError('No se pudieron cargar las habitaciones. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpenDialog(true);
  }

  function openEdit(room) {
    setEditing(room);
    setForm({
      name: room.name || '',
      type: room.type || 'STANDARD',
      size: room.size || '',
      price: room.price || 0,
      totalUnits: room.totalUnits || 1,
      capacity: room.capacity || 1,
      bedType: room.bedType || '',
      amenities: room.amenities || [],
      description: room.description || '',
      lugar: room.lugar || 'casaHotel',
    });
    setOpenDialog(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar habitación? Esta acción no se puede deshacer.')) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/rooms/admin/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      setSuccess('Habitación eliminada exitosamente');
      await fetchRooms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al eliminar habitación:', err);
      setError('No se pudo eliminar la habitación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!form.name) {
      setError('El nombre es requerido');
      return;
    }

    const roomData = {
      name: form.name,
      type: form.type,
      description: form.description,
      price: Number(form.price),
      size: form.size,
      capacity: Number(form.capacity),
      bedType: form.bedType,
      amenities: Array.isArray(form.amenities) ? form.amenities : [],
      lugar: form.lugar,
      totalUnits: Number(form.totalUnits)
    };

    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (editing) {
        response = await fetch(`${API_URL}/api/rooms/admin/${editing._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roomData),
        });
      } else {
        response = await fetch(`${API_URL}/api/rooms/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roomData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      setSuccess(editing ? 'Habitación actualizada exitosamente' : 'Habitación creada exitosamente');
      setOpenDialog(false);
      await fetchRooms();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al guardar habitación:', err);
      setError(err.message || 'No se pudo guardar la habitación. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleChangeField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleChangeAmenities(e) {
    const value = e.target.value;
    const amenitiesArray = value.split(',').map(a => a.trim()).filter(a => a);
    handleChangeField('amenities', amenitiesArray);
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <MeetingRoomIcon />
        <Typography variant="h6">Gestión de habitaciones</Typography>
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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={openCreate}
          disabled={loading}
        >
          Nueva habitación
        </Button>
      </Box>

      {loading && !openDialog ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Unidades</TableCell>
                <TableCell>Lugar</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay habitaciones registradas
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map(r => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.description?.substring(0, 60)}{r.description?.length > 60 ? '...' : ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <AttachMoneyIcon sx={{ fontSize: 18 }} />
                        <Typography>{Number(r.price).toFixed(2)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Inventory2Icon sx={{ fontSize: 18 }} />
                        <Typography>{r.totalUnits}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {r.lugar === 'casaHotel' ? 'Casa Hotel' : 'Boutique'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button 
                          size="small" 
                          startIcon={<EditIcon />} 
                          onClick={() => openEdit(r)}
                          disabled={loading}
                        >
                          Editar
                        </Button>
                        <Button 
                          size="small" 
                          color="error" 
                          startIcon={<DeleteIcon />} 
                          onClick={() => handleDelete(r._id)}
                          disabled={loading}
                        >
                          Eliminar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Editar habitación' : 'Crear habitación'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmitForm}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              label="Nombre" 
              value={form.name} 
              onChange={e => handleChangeField('name', e.target.value)} 
              required 
              disabled={loading}
            />
            
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="tipo-label">Tipo</InputLabel>
                <Select 
                  labelId="tipo-label" 
                  value={form.type || 'STANDARD'} 
                  label="Tipo" 
                  onChange={e => handleChangeField('type', e.target.value)}
                  disabled={loading}
                >
                  {ROOM_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="lugar-label">Lugar</InputLabel>
                <Select 
                  labelId="lugar-label" 
                  value={form.lugar} 
                  label="Lugar" 
                  onChange={e => handleChangeField('lugar', e.target.value)}
                  disabled={loading}
                >
                  {LUGARES.map(l => (
                    <MenuItem key={l} value={l}>
                      {l === 'casaHotel' ? 'Casa Hotel' : 'Boutique'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            
            <TextField 
              label="Descripción" 
              value={form.description} 
              onChange={e => handleChangeField('description', e.target.value)} 
              multiline 
              rows={3} 
              disabled={loading}
            />

            <Stack direction="row" spacing={2}>
              <TextField 
                label="Precio por noche (MXN)" 
                type="number" 
                value={form.price} 
                onChange={e => handleChangeField('price', Number(e.target.value))} 
                fullWidth
                disabled={loading}
              />
              <TextField 
                label="Unidades totales" 
                type="number" 
                inputProps={{ min: 1 }} 
                value={form.totalUnits} 
                onChange={e => handleChangeField('totalUnits', Math.max(1, Number(e.target.value)))} 
                fullWidth
                disabled={loading}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField 
                label="Capacidad (personas)" 
                type="number" 
                inputProps={{ min: 1 }} 
                value={form.capacity} 
                onChange={e => handleChangeField('capacity', Math.max(1, Number(e.target.value)))} 
                fullWidth
                disabled={loading}
              />
              <TextField 
                label="Tamaño" 
                value={form.size} 
                onChange={e => handleChangeField('size', e.target.value)} 
                placeholder="25 m²"
                fullWidth
                disabled={loading}
              />
            </Stack>

            <TextField 
              label="Tipo de cama" 
              value={form.bedType} 
              onChange={e => handleChangeField('bedType', e.target.value)} 
              placeholder="Ej: Cama King Size"
              disabled={loading}
            />

            <TextField 
              label="Servicios incluidos (separados por comas)" 
              value={Array.isArray(form.amenities) ? form.amenities.join(', ') : ''} 
              onChange={handleChangeAmenities}
              placeholder="WiFi, Aire acondicionado, Smart TV"
              helperText="Separa cada servicio con una coma"
              disabled={loading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading}
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