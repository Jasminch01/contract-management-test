const express = require('express');
const c = require('../controllers/seller.controller');

const router = express.Router();

router.post('/', c.createSeller);
router.get('/', c.getSellers);
router.get('/search', c.searchSellers);
router.get('/:id', c.getSeller);
router.put('/:id', c.updateSeller);
router.delete('/:id', c.deleteSeller);



module.exports = router;