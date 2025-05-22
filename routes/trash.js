const express = require('express');
const router = express.Router();
const TrashController = require('../controllers/trashController');

router.get('/trash', TrashController.getTrashBin);
router.delete('/trash/bulk', TrashController.bulkDeleteTrash);

module.exports = router;