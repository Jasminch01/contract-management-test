const Buyer = require("../models/Buyer");
const Seller = require("../models/Seller");
const Contract = require("../models/Contract");

exports.getTrashBin = async (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Initialize result structure
    const result = {
      buyers: [],
      sellers: [],
      contracts: [],
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalPages: 0,
        totalItems: 0,
      },
      summary: {
        totalBuyers: 0,
        totalSellers: 0,
        totalContracts: 0,
        totalDeleted: 0,
      },
    };

    // Always get counts for summary (regardless of filtering)
    const [totalBuyers, totalSellers, totalContracts] = await Promise.all([
      Buyer.countDocuments({ isDeleted: true }),
      Seller.countDocuments({ isDeleted: true }),
      Contract.countDocuments({ isDeleted: true }),
    ]);

    // Update summary
    result.summary = {
      totalBuyers,
      totalSellers,
      totalContracts,
      totalDeleted: totalBuyers + totalSellers + totalContracts,
    };

    // Handle specific type filtering
    if (type === "buyers") {
      result.buyers = await Buyer.find({ isDeleted: true })
        .skip(skip)
        .limit(limitNum)
        .sort({ deletedAt: -1 });

      result.pagination.totalItems = totalBuyers;
      result.pagination.totalPages = Math.ceil(totalBuyers / limitNum);
    } else if (type === "sellers") {
      result.sellers = await Seller.find({ isDeleted: true })
        .skip(skip)
        .limit(limitNum)
        .sort({ deletedAt: -1 });

      result.pagination.totalItems = totalSellers;
      result.pagination.totalPages = Math.ceil(totalSellers / limitNum);
    } else if (type === "contracts") {
      result.contracts = await Contract.find({ isDeleted: true })
        .skip(skip)
        .limit(limitNum)
        .sort({ deletedAt: -1 });

      result.pagination.totalItems = totalContracts;
      result.pagination.totalPages = Math.ceil(totalContracts / limitNum);
    } else {
      // No type filter - fetch all types and handle combined pagination
      const totalItems = totalBuyers + totalSellers + totalContracts;
      result.pagination.totalItems = totalItems;
      result.pagination.totalPages = Math.ceil(totalItems / limitNum);

      if (totalItems > 0) {
        // Fetch all deleted items from all collections with pagination applied at database level
        const [buyersData, sellersData, contractsData] = await Promise.all([
          Buyer.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean(),
          Seller.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean(),
          Contract.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean(),
        ]);

        // Combine all items and add type information
        const allItems = [
          ...buyersData.map((item) => ({ ...item, itemType: "Buyer" })),
          ...sellersData.map((item) => ({ ...item, itemType: "Seller" })),
          ...contractsData.map((item) => ({ ...item, itemType: "Contract" })),
        ];

        // Sort by deletedAt in descending order (most recent first)
        allItems.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));

        // Apply pagination to the combined sorted array
        const paginatedItems = allItems.slice(skip, skip + limitNum);

        // Separate items back into their respective arrays
        result.buyers = paginatedItems
          .filter((item) => item.itemType === "Buyer")
          .map(({ itemType, ...item }) => item);

        result.sellers = paginatedItems
          .filter((item) => item.itemType === "Seller")
          .map(({ itemType, ...item }) => item);

        result.contracts = paginatedItems
          .filter((item) => item.itemType === "Contract")
          .map(({ itemType, ...item }) => item);
      }
    }

    res.status(200).json({data :{
      data: result,
      success: true,
    }});
  } catch (error) {
    console.error("Error in getTrashBin:", error);
    res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
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

exports.emptyAllTrash = async (req, res) => {
  try {
    // Add await keywords and store results
    const buyerDelete = await Buyer.deleteMany({ isDeleted: true });
    const sellerDelete = await Seller.deleteMany({ isDeleted: true });
    const contractDelete = await Contract.deleteMany({ isDeleted: true });

    res.status(200).json({
      success: true,
      message: "All trash emptied successfully",
      deletedCounts: {
        buyers: buyerDelete.deletedCount,
        sellers: sellerDelete.deletedCount,
        contracts: contractDelete.deletedCount,
      },
    });
  } catch (error) {
    console.error("Error emptying trash:", error);
    res.status(500).json({
      success: false,
      message: "Failed to empty trash",
      error: error.message,
    });
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
