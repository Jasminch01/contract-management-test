const express = require('express');
const c = require('../controllers/seller.controller');

const router = express.Router();

router.patch('/:id/trash',     c.trashSeller);
router.get('/trash',           c.getTrashSellers);
router.patch('/:id/restore',   c.restoreSeller);
router.delete('/:id/permanent',c.deleteSellerPermanent);
router.delete('/trash/bulk',   c.bulkDeleteSellers);


router.post('/', c.createSeller);
router.get('/', c.getSellers);
router.get('/search', c.searchSellers);
router.get('/:id', c.getSeller);
router.put('/:id', c.updateSeller);
router.delete('/:id', c.deleteSeller);



module.exports = router;