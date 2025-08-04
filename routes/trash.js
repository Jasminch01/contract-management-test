const express = require('express');
const router = express.Router();
const TrashController = require('../controllers/trashController');

router.get('/trash', TrashController.getTrashBin);
router.delete('/trash/bulk', TrashController.bulkDeleteTrash);
router.delete('/trash/permanent', TrashController.permanentDeleteTrash);
router.post('/trash/bulk/restore', TrashController.bulkRestoreTrash);

module.exports = router;