// routes/bookingLinks.js
const express = require('express');
const router = express.Router();
const BookingLink = require('../models/BookingLink');
const crypto = require('crypto');

// Generar link único de reserva
router.post('/', async (req, res) => {
  try {
    const { roomId, roomType, roomName, expiresIn = 30 } = req.body;
    
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
    
    const bookingLink = new BookingLink({
      token,
      roomId,
      roomType,
      roomName,
      expiresAt,
      createdBy: req.user?.id || 'dashboard'
    });
    
    await bookingLink.save();
    
    const link = `${process.env.FRONTEND_URL}/booking-form?token=${token}`;
    
    res.json({
      success: true,
      link,
      token,
      expiresAt,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`
    });
  } catch (error) {
    console.error('Error generando link:', error);
    res.status(500).json({ error: 'Error generando link de reserva' });
  }
});

// Validar token de link
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const bookingLink = await BookingLink.findOne({ 
      token,
      active: true,
      expiresAt: { $gt: new Date() }
    }).populate('roomId');
    
    if (!bookingLink) {
      return res.status(404).json({ 
        valid: false,
        error: 'Link inválido o expirado' 
      });
    }
    
    // Incrementar contador de uso
    bookingLink.uses = (bookingLink.uses || 0) + 1;
    bookingLink.lastUsedAt = new Date();
    await bookingLink.save();
    
    res.json({
      valid: true,
      roomId: bookingLink.roomId._id,
      roomType: bookingLink.roomType,
      roomName: bookingLink.roomName,
      room: bookingLink.roomId
    });
  } catch (error) {
    console.error('Error validando link:', error);
    res.status(500).json({ error: 'Error validando link' });
  }
});

// Obtener estadísticas de links
router.get('/stats', async (req, res) => {
  try {
    const stats = await BookingLink.aggregate([
      {
        $group: {
          _id: '$roomType',
          totalLinks: { $sum: 1 },
          activeLinks: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ['$active', true] },
                  { $gt: ['$expiresAt', new Date()] }
                ]}, 
                1, 
                0 
              ]
            }
          },
          totalUses: { $sum: '$uses' },
          avgUses: { $avg: '$uses' }
        }
      }
    ]);
    
    const totalStats = await BookingLink.aggregate([
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          activeLinks: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ['$active', true] },
                  { $gt: ['$expiresAt', new Date()] }
                ]}, 
                1, 
                0 
              ]
            }
          },
          totalUses: { $sum: '$uses' }
        }
      }
    ]);
    
    res.json({
      byRoomType: stats,
      total: totalStats[0] || {},
      conversionRate: totalStats[0] ? 
        (totalStats[0].totalUses / totalStats[0].totalLinks * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Desactivar link
router.patch('/:token/deactivate', async (req, res) => {
  try {
    const { token } = req.params;
    
    const bookingLink = await BookingLink.findOneAndUpdate(
      { token },
      { active: false, deactivatedAt: new Date() },
      { new: true }
    );
    
    if (!bookingLink) {
      return res.status(404).json({ error: 'Link no encontrado' });
    }
    
    res.json({
      success: true,
      message: 'Link desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error desactivando link:', error);
    res.status(500).json({ error: 'Error desactivando link' });
  }
});

module.exports = router;
