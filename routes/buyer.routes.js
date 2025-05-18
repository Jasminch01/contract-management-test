const express = require('express');
const c = require('../controllers/buyer.controller');

const router = express.Router();

router.patch('/:id/trash', c.trashBuyer);
router.get('/trash', c.getTrashBuyers);
router.patch('/:id/restore', c.restoreBuyer);
router.delete('/:id/permanent', c.deleteBuyerPermanent);
router.delete('/trash/bulk', c.bulkDeleteBuyers);

router.post('/',  c.createBuyer);
router.get('/',   c.getBuyers);
router.get('/search', c.searchBuyers);
router.get('/:id', c.getBuyer);
router.put('/:id', c.updateBuyer);
router.delete('/:id', c.deleteBuyer);



module.exports = router;