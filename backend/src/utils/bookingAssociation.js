const mongoose = require('mongoose');

function normalizeGuestAssignmentId(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return mongoose.Types.ObjectId.isValid(trimmed) ? trimmed : null;
  }
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  return null;
}

function buildBookingAssociationPayload(input = {}) {
  const normalized = normalizeGuestAssignmentId(input.guestAssignmentId);
  if (!normalized) return {};
  return { guestAssignmentId: normalized };
}

module.exports = {
  normalizeGuestAssignmentId,
  buildBookingAssociationPayload,
};
