import React, { useEffect, useState } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';

import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import EditIcon from '@mui/icons-material/Edit';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function AdministracionReservas() {
  const [rooms, setRooms] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingDialogOpen, setEditingDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Cargar datos iniciales
  useEffect(() => {
    fetchRooms();
    fetchReservas();
  }, []);

  async function fetchRooms() {
    try {
      const response = await fetch(`${API_URL}/api/rooms/admin`);
      if (!response.ok) throw new Error('Error al cargar habitaciones');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      console.error('Error al cargar habitaciones:', err);
    }
  }

  async function fetchReservas() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/bookings`);
      if (!response.ok) throw new Error('Error al cargar reservas');
      const data = await response.json();
      setReservas(data);
    } catch (err) {
      console.error('Error al cargar reservas:', err);
      setError('No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  }

  function openView(res) {
    setSelected(res);
    setViewDialogOpen(true);
  }

  function openEdit(res) {
    setSelected(res);
    setEditForm({
      ...res,
      checkIn: new Date(res.checkIn).toISOString().slice(0, 10),
      checkOut: new Date(res.checkOut).toISOString().slice(0, 10),
    });
    setEditingDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!editForm) return;

    // Validación de fechas
    if (new Date(editForm.checkOut) <= new Date(editForm.checkIn)) {
      setError('Fecha check-out debe ser después de check-in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/bookings/${editForm.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: editForm.checkIn,
          checkOut: editForm.checkOut,
          roomId: editForm.roomId,
          guestInfo: editForm.guestInfo,
          status: editForm.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar reserva');
      }

      setSuccess('Reserva actualizada exitosamente');
      setEditingDialogOpen(false);
      await fetchReservas();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al actualizar reserva:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelReserva(res) {
    if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/bookings/${res.bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Error al cancelar reserva');
      }

      setSuccess('Reserva cancelada exitosamente');
      await fetchReservas();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al cancelar reserva:', err);
      setError('No se pudo cancelar la reserva');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkSecondNightPaid(res) {
    if (!window.confirm('¿Marcar segunda noche como pagada?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/bookings/${res.bookingId}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Error al marcar como pagado');
      }

      setSuccess('Segunda noche marcada como pagada');
      await fetchReservas();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al marcar como pagado:', err);
      setError('No se pudo marcar como pagado');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadVoucher(bookingId) {
    try {
      const response = await fetch(`${API_URL}/api/bookings/download/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Error al descargar voucher');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Voucher_${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Voucher descargado exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al descargar voucher:', err);
      setError('No se pudo descargar el voucher');
    }
  }

  function getRoomName(id) {
    return rooms.find(r => r._id === id)?.name || '—';
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
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount || 0);
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <ManageAccountsIcon />
        <Typography variant="h6">Administración de reservas</Typography>
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

      <Typography variant="body2" sx={{ mb: 2 }}>
        Ver, editar, cancelar y gestionar reservas. Detalle muestra cliente, habitación, fechas y pagos.
      </Typography>

      {loading && !viewDialogOpen && !editingDialogOpen ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID Reserva</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Habitación</TableCell>
                <TableCell>Fechas</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Pago</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay reservas registradas
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reservas.map(r => (
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
                    <TableCell>{formatCurrency(r.totalPrice)}</TableCell>
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
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        <IconButton 
                          size="small" 
                          onClick={() => openView(r)} 
                          title="Ver detalle"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => openEdit(r)} 
                          title="Editar"
                          disabled={loading}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDownloadVoucher(r.bookingId)} 
                          title="Descargar voucher"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                        {r.status !== 'cancelled' && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleCancelReserva(r)} 
                            title="Cancelar"
                            disabled={loading}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        )}
                        {r.paymentStatus === 'partial' && !r.secondNightNotePaid && (
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleMarkSecondNightPaid(r)} 
                            title="Marcar 2da noche pagada"
                            disabled={loading}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle de reserva</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selected.bookingId}
                </Typography>
                <Chip 
                  label={selected.status} 
                  color={chipColorForStatus(selected.status)} 
                  size="small"
                />
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Información del huésped
                </Typography>
                <Typography variant="body2">
                  <strong>Nombre:</strong> {selected.guestInfo?.firstName} {selected.guestInfo?.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {selected.guestInfo?.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Teléfono:</strong> {selected.guestInfo?.phone || 'N/A'}
                </Typography>
                {selected.guestInfo?.specialRequests && (
                  <Typography variant="body2">
                    <strong>Solicitudes especiales:</strong> {selected.guestInfo.specialRequests}
                  </Typography>
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Detalles de la reserva
                </Typography>
                <Typography variant="body2">
                  <strong>Habitación:</strong> {selected.roomName}
                </Typography>
                <Typography variant="body2">
                  <strong>Check-in:</strong> {formatDate(selected.checkIn)}
                </Typography>
                <Typography variant="body2">
                  <strong>Check-out:</strong> {formatDate(selected.checkOut)}
                </Typography>
                <Typography variant="body2">
                  <strong>Noches:</strong> {selected.nights}
                </Typography>
                <Typography variant="body2">
                  <strong>Precio por noche:</strong> {formatCurrency(selected.pricePerNight)}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Información de pago
                </Typography>
                <Typography variant="body2">
                  <strong>Subtotal:</strong> {formatCurrency(selected.subtotal)}
                </Typography>
                <Typography variant="body2">
                  <strong>IVA (16%):</strong> {formatCurrency(selected.tax)}
                </Typography>
                <Typography variant="body2">
                  <strong>Total:</strong> {formatCurrency(selected.totalPrice)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Pago inicial (50%):</strong> {formatCurrency(selected.initialPayment)}
                </Typography>
                <Typography variant="body2">
                  <strong>Pendiente (2da noche):</strong> {formatCurrency(selected.secondNightPayment)}
                </Typography>
                <Chip 
                  label={`Estado: ${selected.paymentStatus}`} 
                  color={chipColorForPayment(selected.paymentStatus)}
                  size="small"
                  sx={{ mt: 1 }}
                />
                {selected.secondNightNotePaid && (
                  <Chip 
                    label="2da noche pagada ✓" 
                    color="success"
                    size="small"
                    sx={{ mt: 1, ml: 1 }}
                  />
                )}
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Información adicional
                </Typography>
                <Typography variant="body2">
                  <strong>Fecha de creación:</strong> {formatDate(selected.createdAt)}
                </Typography>
                {selected.stripePaymentIntentId && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Payment Intent: {selected.stripePaymentIntentId}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
          {selected && (
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadVoucher(selected.bookingId)}
            >
              Descargar Voucher
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editingDialogOpen} onClose={() => setEditingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar reserva</DialogTitle>
        <DialogContent>
          {editForm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Nombre"
                value={editForm.guestInfo?.firstName || ''}
                onChange={e => setEditForm(prev => ({
                  ...prev,
                  guestInfo: { ...prev.guestInfo, firstName: e.target.value }
                }))}
                disabled={loading}
              />

              <TextField
                label="Apellido"
                value={editForm.guestInfo?.lastName || ''}
                onChange={e => setEditForm(prev => ({
                  ...prev,
                  guestInfo: { ...prev.guestInfo, lastName: e.target.value }
                }))}
                disabled={loading}
              />

              <TextField
                label="Email"
                type="email"
                value={editForm.guestInfo?.email || ''}
                onChange={e => setEditForm(prev => ({
                  ...prev,
                  guestInfo: { ...prev.guestInfo, email: e.target.value }
                }))}
                disabled={loading}
              />

              <TextField
                label="Teléfono"
                value={editForm.guestInfo?.phone || ''}
                onChange={e => setEditForm(prev => ({
                  ...prev,
                  guestInfo: { ...prev.guestInfo, phone: e.target.value }
                }))}
                disabled={loading}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Check-in"
                  type="date"
                  value={editForm.checkIn}
                  onChange={e => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                  fullWidth
                />
                <TextField
                  label="Check-out"
                  type="date"
                  value={editForm.checkOut}
                  onChange={e => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                  fullWidth
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={editForm.status}
                  label="Estado"
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  disabled={loading}
                >
                  <MenuItem value="active">Activa</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDialogOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveEdit}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}