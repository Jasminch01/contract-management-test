const express = require('express');
const router = express.Router();
const c = require('../controllers/xero.controller');

// Authorize - Start OAuth flow
router.get('/xero/authorize', c.authorize);

// Callback - Handle OAuth redirect
router.get('/auth/xero/callback', c.callback);

// Get connection status
router.get('/xero/status', c.getStatus);

// Create invoice
router.post('/xero/create-invoice', c.createInvoice);

module.exports = router;