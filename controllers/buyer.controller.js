const Buyer = require("../models/Buyer");

exports.createBuyer = async (req, res) => {
  try {
    const buyer = await Buyer.create(req.body);
    res.status(201).json(buyer);
  } catch (error) {
    res.status(400).json({ message: "Buyer creation failed", error });
  }
};

exports.getBuyers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      name,
      abn,
      dateFilter,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Convert page and limit to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build the query object
    let query = { isDeleted: { $ne: true } }; // Exclude deleted items
    // Search filters - using $or for multiple field search
    const searchConditions = [];

    if (name) {
      searchConditions.push({ name: { $regex: name, $options: "i" } });
    }
    if (abn) {
      searchConditions.push({ abn: { $regex: abn, $options: "i" } });
    }

    // If any search conditions exist, use $or
    if (searchConditions.length > 0) {
      query.$or = searchConditions;
    }

    // Date filter
    if (dateFilter && dateFilter !== "all") {
      const now = new Date();

      if (dateFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: today };
      } else if (dateFilter === "lastWeek") {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        query.createdAt = { $gte: lastWeek };
      }
    }

    // Build sort object
    const sortObj = {};
    if (sortBy) {
      sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Execute queries
    const [buyers, totalCount] = await Promise.all([
      Buyer.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(), // Use lean() for better performance
      Buyer.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    // Send response
    res.json({
      data: {
        page: pageNum,
        totalPages,
        total: totalCount,
        data: buyers,
      },
    });
  } catch (error) {
    console.error("Error fetching buyers with pagination:", error);
    res.status(500).json({
      message: "Error fetching buyers",
      error: error.message,
    });
  }
};

exports.getBuyer = async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.params.id);
    if (!buyer) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(buyer);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.updateBuyer = async (req, res) => {
  try {
    const buyer = await Buyer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!buyer) return res.status(404).json({ message: "Not found" });
    res.json(buyer);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.deleteBuyer = async (req, res) => {
  try {
    await Buyer.findByIdAndDelete(req.params.id);
    res.json({ message: "Buyer deleted" });
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.searchBuyers = async (req, res) => {
  try {
    const q = req.query.q || "";
    const buyers = await Buyer.find({
      $or: [{ name: new RegExp(q, "i") }, { abn: new RegExp(q, "i") }],
    });
    res.json({ data: buyers });
  } catch (err) {
    res.status(500).json(err);
  }
};

// move single Buyer to trash
exports.trashBuyer = async (req, res) => {
  try {
    const b = await Buyer.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!b) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Moved to rubbish bin", b });
  } catch (err) {
    res.status(500).json(err);
  }
};

// list trashed Buyers
exports.getTrashBuyers = async (_req, res) => {
  try {
    const list = await Buyer.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json(err);
  }
};

// restore Buyer
exports.restoreBuyer = async (req, res) => {
  try {
    const b = await Buyer.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!b) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Restored", b });
  } catch (err) {
    res.status(500).json(err);
  }
};

// permanent delete Buyer
exports.deleteBuyerPermanent = async (req, res) => {
  try {
    await Buyer.findByIdAndDelete(req.params.id);
    res.json({ message: "Permanently deleted" });
  } catch (err) {
    res.status(500).json(err);
  }
};

// 🗑️🔨 bulk permanent delete (?ids=comma,separated)
exports.bulkDeleteBuyers = async (req, res) => {
  try {
    const ids = (req.query.ids || "").split(",").filter(Boolean);
    await Buyer.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${ids.length} buyers` });
  } catch (err) {
    res.status(500).json(err);
  }
};
