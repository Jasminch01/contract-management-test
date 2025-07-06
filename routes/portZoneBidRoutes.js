const express = require('express');
const router = express.Router();
const portZoneBidController = require('../controllers/portZoneBidController');

router.post('/', portZoneBidController.createPortZoneBid);
router.get('/', portZoneBidController.getPortZoneBids);
router.get('/:id', portZoneBidController.getPortZoneBid);
router.put('/:id', portZoneBidController.updatePortZoneBid);
router.delete('/:id', portZoneBidController.deletePortZoneBid);

// CSV Export route
router.get('/export-csv', portZoneBidController.exportPortZoneBidsCSV);

module.exports = router;
