const mongoose = require('mongoose');

const XeroTokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  tenantId: {
    type: String,
    required: true,
  },
  tenantName: String,
  idToken: String,
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.XeroToken || mongoose.model('XeroToken', XeroTokenSchema);