const express = require('express');
const router = express.Router();
const c = require('../controllers/priceBidController');

router.post('/', c.createPriceBid);
router.get('/', c.getPriceBids);
router.get('/:id', c.getPriceBid);
router.put('/:id', c.updatePriceBid);
router.delete('/:id', c.deletePriceBid);

module.exports = router;