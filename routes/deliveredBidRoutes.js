const express = require('express');
const router = express.Router();
const c = require('../controllers/deliveredBidController');

router.post('/', c.createDeliveredBid);
router.get('/', c.getDeliveredBids);
router.get('/:id', c.getDeliveredBid);
router.put('/:id', c.updateDeliveredBid);
router.delete('/:id', c.deleteDeliveredBid);

module.exports = router;