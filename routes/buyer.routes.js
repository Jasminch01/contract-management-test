const express = require('express');
const c = require('../controllers/buyer.controller');

const router = express.Router();

router.post('/',  c.createBuyer);
router.get('/',   c.getBuyers);
router.get('/search', c.searchBuyers);
router.get('/:id', c.getBuyer);
router.put('/:id', c.updateBuyer);
router.delete('/:id', c.deleteBuyer);



module.exports = router;