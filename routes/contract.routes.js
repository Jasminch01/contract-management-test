const express = require("express");
const router = express.Router();

const contractController = require("../controllers/contract.controller");

// trash management.
router.get("/trash", contractController.getDeletedContracts);
router.patch("/:id/trash", contractController.softDeleteContract);
router.patch("/:id/restore", contractController.restoreContract);
router.delete("/:id/permanent", contractController.hardDeleteContract);

// In your routes file
router.get("/next-number", contractController.getNextContractNumber);
router.post("/", contractController.createContract);
router.get("/", contractController.getAllContracts);
router.get("/:id", contractController.getContractById);
router.put("/:id", contractController.updateContract);
router.delete("/:id", contractController.deleteContract);

module.exports = router;
