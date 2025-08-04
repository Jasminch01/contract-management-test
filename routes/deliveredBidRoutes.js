const express = require('express');
const router = express.Router();
const c = require('../controllers/deliveredBidController');

router.post('/', c.createOrUpdateDeliveredBid);
router.get('/', c.getDeliveredBids);
router.get('/:id', c.getDeliveredBid);
router.delete('/:id', c.deleteDeliveredBid);
router.get('/export-csv', c.exportDeliveredBidsCSV);

module.exports = router;