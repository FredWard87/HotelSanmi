const express = require('express');
const router = express.Router();
const weddingController = require('../controllers/weddingController');

// Public: create a visit appointment
router.post('/appointments', weddingController.createVisit);

// Admin: list appointments
router.get('/appointments', weddingController.listVisits);
router.get('/appointments/:id', weddingController.getVisit);
router.patch('/appointments/:id/status', weddingController.updateVisitStatus);
// Admin: full update and delete
router.put('/appointments/:id', weddingController.updateVisit);
router.delete('/appointments/:id', weddingController.deleteVisit);

module.exports = router;
