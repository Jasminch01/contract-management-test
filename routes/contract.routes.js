const express = require('express');
const router = express.Router();

const contractController = require('../controllers/contract.controller');
const upload = require('../middelwares/upload.middleware');

//Express checks routes top to bottom, and the first one that matches is used. If /:id comes before /trash, 
// then "trash" is matched as :id, causing a Mongoose CastError.

// trash management.
router.get('/trash', contractController.getDeletedContracts);
router.patch('/:id/trash', contractController.softDeleteContract);
router.patch('/:id/restore', contractController.restoreContract);
router.delete('/:id/permanent', contractController.hardDeleteContract);


// create contract with file upload.
router.post('/', upload, contractController.createContract);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.put('/:id', upload, contractController.updateContract);
router.delete('/:id', contractController.deleteContract);
router.get('/:id/export-pdf', contractController.exportContractPDF);
router.get('/:id/export-csv', contractController.exportContractCSV);
router.get('/:id/preview', contractController.previewContract);

// Send email
router.post('/:id/email', contractController.sendContractByEmail);




module.exports = router;
