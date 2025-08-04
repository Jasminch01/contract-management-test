const Buyer = require("../models/Buyer");
const Seller = require("../models/Seller");
const Contract = require("../models/Contract");

exports.getTrashBin = async (req, res) => {
  const { type } = req.query;

  try {
    const result = {};

    if (!type || type === "buyers") {
      result.buyers = await Buyer.find({ isDeleted: true });
    }

    if (!type || type === "sellers") {
      result.sellers = await Seller.find({ isDeleted: true });
    }

    if (!type || type === "contracts") {
      result.contracts = await Contract.find({ isDeleted: true });
    }

    res.status(200).json({ data: result, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.bulkDeleteTrash = async (req, res) => {
  const { buyers = [], sellers = [], contracts = [] } = req.body;

  try {
    const buyerDelete =
      buyers.length > 0
        ? await Buyer.deleteMany({ _id: { $in: buyers } })
        : null;
    const sellerDelete =
      sellers.length > 0
        ? await Seller.deleteMany({ _id: { $in: sellers } })
        : null;
    const contractDelete =
      contracts.length > 0
        ? await Contract.deleteMany({ _id: { $in: contracts } })
        : null;

    res.status(200).json({
      message: "Bulk delete successful",
      deleted: {
        buyers: buyerDelete?.deletedCount || 0,
        sellers: sellerDelete?.deletedCount || 0,
        contracts: contractDelete?.deletedCount || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.bulkRestoreTrash = async (req, res) => {
  const { itemIds = [] } = req.body;
  if (!itemIds || itemIds.length === 0) {
    return res.status(400).json({
      message: "No item IDs provided for restoration",
    });
  }

  try {
    // Restore buyers
    const buyerRestore = await Buyer.updateMany(
      { _id: { $in: itemIds }, isDeleted: true },
      { isDeleted: false, deletedAt: null }
    );

    // Restore sellers
    const sellerRestore = await Seller.updateMany(
      { _id: { $in: itemIds }, isDeleted: true },
      { isDeleted: false, deletedAt: null }
    );

    // Restore contracts
    const contractRestore = await Contract.updateMany(
      { _id: { $in: itemIds }, isDeleted: true },
      { isDeleted: false, deletedAt: null }
    );

    const totalRestored =
      (buyerRestore?.modifiedCount || 0) +
      (sellerRestore?.modifiedCount || 0) +
      (contractRestore?.modifiedCount || 0);

    if (totalRestored === 0) {
      return res.status(404).json({
        message: "No matching deleted items found with the provided IDs",
      });
    }

    res.status(200).json({
      message: "Bulk restore successful",
      restored: {
        buyers: buyerRestore?.modifiedCount || 0,
        sellers: sellerRestore?.modifiedCount || 0,
        contracts: contractRestore?.modifiedCount || 0,
        total: totalRestored,
      },
    });
  } catch (error) {
    console.error("Error in bulk restore:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

//permanent delete with id/ids
exports.permanentDeleteTrash = async (req, res) => {
  const { ids = [] } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      message: "No IDs provided for deletion",
    });
  }

  try {
    let totalDeleted = 0;
    const deletionResults = {
      buyers: 0,
      sellers: 0,
      contracts: 0,
    };

    // Try to delete from each collection
    const buyerDelete = await Buyer.deleteMany({ _id: { $in: ids } });
    deletionResults.buyers = buyerDelete.deletedCount;
    totalDeleted += buyerDelete.deletedCount;

    const sellerDelete = await Seller.deleteMany({ _id: { $in: ids } });
    deletionResults.sellers = sellerDelete.deletedCount;
    totalDeleted += sellerDelete.deletedCount;

    const contractDelete = await Contract.deleteMany({ _id: { $in: ids } });
    deletionResults.contracts = contractDelete.deletedCount;
    totalDeleted += contractDelete.deletedCount;

    if (totalDeleted === 0) {
      return res.status(404).json({
        message: "No items found with the provided IDs",
        deleted: deletionResults,
      });
    }

    res.status(200).json({
      message: `Permanent delete successful - ${totalDeleted} item(s) deleted`,
      deleted: deletionResults,
      totalDeleted,
    });
  } catch (error) {
    console.error("Error in permanent delete:", error);
    res.status(500).json({
      message: "Server error during permanent deletion",
      error: error.message,
    });
  }
};
