const express = require('express');
const router = express.Router();

const contractController = require('../controllers/contract.controller');
const upload = require('../middelwares/upload.middleware');

// create contract with file upload.
router.post('/', upload.single('attachedSellerContract'), contractController.createContract);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.put('/:id', upload.single('attachedSellerContract'), contractController.updateContract);
router.delete('/:id', contractController.deleteContract);

module.exports = router;
