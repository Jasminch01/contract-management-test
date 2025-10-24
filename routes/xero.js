const express = require('express');
const router = express.Router();
const c = require('../controllers/xero.controller');

router.get('/xero/authorize', c.authorize);
router.get('/auth/xero/callback', c.callback);
router.get('/xero/status', c.getStatus);
router.post('/xero/create-invoice', c.createInvoice);

module.exports = router;