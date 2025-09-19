const PDFDocument = require("pdfkit");
const Contract = require("../models/Contract");
const { mongo, default: mongoose } = require("mongoose");
const { Parser } = require("json2csv");
const { sendEmail } = require("../utils/mailer");
const stream = require("stream");
const Seller = require("../models/Seller");
const Buyer = require("../models/Buyer");

// @desc Create a new contract.
exports.createContract = async (req, res) => {
  try {
    const data = req.body;
    // Validate required fields
    if (!data.contractDate) {
      return res.status(400).json({ message: "contractDate is required." });
    }

    // Parse and validate contractDate
    let parsedContractDate;
    try {
      parsedContractDate = new Date(data.contractDate);
      if (isNaN(parsedContractDate.getTime())) {
        throw new Error("Invalid contractDate format.");
      }
      data.contractDate = parsedContractDate; // Ensure date is in Date object format
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    if (req.files) {
      if (req.files.attachedSellerContract)
        data.attachedSellerContract =
          req.files.attachedSellerContract[0].filename;
      if (req.files.attachedBuyerContract)
        data.attachedBuyerContract =
          req.files.attachedBuyerContract[0].filename;
    }

    const contract = new Contract(data);
    await contract.save();
    res.status(201).json(contract); // Include contractDate in response
  } catch (error) {
    res.status(500).json({ message: "Error creating contract", error });
  }
};
exports.generateNextContractNumberV2 = async () => {
  try {
    // Use aggregation to properly sort by the numeric part of contract number
    const result = await Contract.aggregate([
      {
        $match: {
          contractNumber: { $regex: /^JZ\d{5}$/ },
        },
      },
      {
        $addFields: {
          // Extract numeric part for proper sorting
          numericPart: {
            $toInt: { $substr: ["$contractNumber", 2, 5] },
          },
        },
      },
      {
        $sort: { numericPart: -1 },
      },
      {
        $limit: 1,
      },
      {
        $project: {
          contractNumber: 1,
          numericPart: 1,
        },
      },
    ]);

    let nextSequence = 2600;

    if (result.length > 0 && result[0].numericPart) {
      nextSequence = result[0].numericPart + 1;
    }

    return `JZ${String(nextSequence).padStart(5, "0")}`;
  } catch (error) {
    // console.error("Error generating contract number:", error);
    const timestamp = Date.now();
    const fallbackNumber = Math.max(
      2600,
      parseInt(timestamp.toString().slice(-5))
    );
    return `JZ${String(fallbackNumber).padStart(5, "0")}`;
  }
};
exports.getNextContractNumber = async (req, res) => {
  try {
    // Use the V2 function for better sorting
    const nextContractNumber = await exports.generateNextContractNumberV2();
    res.status(200).json({
      data: {
        nextContractNumber,
        success: true,
      },
    });
  } catch (error) {
    // console.error("Error in getNextContractNumber:", error);
    res.status(500).json({
      message: "Error getting next contract number",
      error: error.message,
      success: false,
    });
  }
};

exports.getAllContracts = async (req, res) => {
  try {
    const {
      commodity,
      grade,
      contractNumber,
      tonnes,
      ngrNumber,
      buyerName,
      sellerName,
      status,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    console.log("Search params:", { buyerName, sellerName }); // Debug log

    const filter = { isDeleted: false };

    // ✅ Commodity search (case-insensitive partial match)
    if (commodity) {
      filter.commodity = new RegExp(commodity, "i");
    }

    // ✅ Grade search (case-insensitive partial match)
    if (grade) {
      filter.grade = new RegExp(grade, "i");
    }

    // ✅ Contract Number search (case-insensitive partial match)
    if (contractNumber) {
      filter.contractNumber = new RegExp(contractNumber, "i");
    }

    // ✅ Tonnes search (handle as number)
    if (tonnes) {
      const tonnesValue = Number(tonnes);
      if (!isNaN(tonnesValue)) {
        filter.tonnes = tonnesValue;
      }
    }

    // ✅ NGR search (handle both string and number)
    if (ngrNumber) {
      const ngrAsNumber = Number(ngrNumber);
      if (!isNaN(ngrAsNumber)) {
        filter.ngrNumber = ngrAsNumber;
      } else {
        filter.ngrNumber = new RegExp(ngrNumber, "i");
      }
    }

    // ✅ Status filter
    if (status) {
      filter.status = new RegExp(status, "i");
    }
    if (buyerName) {
      try {
        const buyers = await Buyer.find({
          $or: [
            { name: new RegExp(buyerName, "i") },
            { legalName: new RegExp(buyerName, "i") },
            { companyName: new RegExp(buyerName, "i") },
          ],
        }).select("_id");


        if (buyers.length > 0) {
          filter.buyer = { $in: buyers.map((b) => b._id) };
        } else {
          // If no buyers found, set impossible condition to return empty result
          filter.buyer = { $in: [] };
        }
      } catch (error) {
        filter.buyer = { $in: [] };
      }
    }

    // ✅ FIXED: Seller search (search in Seller collection, not User)
    if (sellerName) {
      try {
        const sellers = await Seller.find({
          $or: [
            { name: new RegExp(sellerName, "i") },
            { legalName: new RegExp(sellerName, "i") },
            { companyName: new RegExp(sellerName, "i") },
            { firstName: new RegExp(sellerName, "i") },
            { lastName: new RegExp(sellerName, "i") },
          ],
        }).select("_id");

        if (sellers.length > 0) {
          filter.seller = { $in: sellers.map((s) => s._id) };
        } else {
          // If no sellers found, set impossible condition to return empty result
          filter.seller = { $in: [] };
        }
      } catch (error) {
        filter.seller = { $in: [] };
      }
    }

   // console.log("Final search filters applied:", filter); // 🔍 Debug log

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [data, total] = await Promise.all([
      Contract.find(filter)
        .populate({
          path: "buyer",
        })
        .populate({
          path: "seller",
        })
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Contract.countDocuments(filter),
    ]);

    // ✅ Fixed response structure
    res.json({
      data: {
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        data,
      },
    });
  } catch (error) {
   // console.error("Error fetching contracts:", error);
    res.status(500).json({
      message: "Error fetching contracts",
      error: error.message,
    });
  }
};

// @desc Get a single contract
exports.getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate(
      "buyer seller"
    );

    if (!contract || contract.isDeleted) {
      return res.status(404).json({ message: "Contract not found" });
    }

    res.status(200).json(contract); // Ensure contractDate is included
  } catch (error) {
    console.error("Error fetching contract:", error);
    res
      .status(500)
      .json({ message: "Error fetching contract", error: error.message });
  }
};

// @desc Update a contract by id.
exports.updateContract = async (req, res) => {
  const data = req.body;
  try {
    // Validate contractDate if provided
    if (data.contractDate) {
      let parsedContractDate;
      try {
        parsedContractDate = new Date(data.contractDate);
        if (isNaN(parsedContractDate.getTime())) {
          throw new Error("Invalid contractDate format.");
        }
        data.contractDate = parsedContractDate;
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }

    if (req.files) {
      if (req.files.attachedSellerContract)
        data.attachedSellerContract =
          req.files.attachedSellerContract[0].filename;
      if (req.files.attachedBuyerContract)
        data.attachedBuyerContract =
          req.files.attachedBuyerContract[0].filename;
    }

    const updated = await Contract.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!updated) {
      return res.status(400).json({ message: "Contract not found" });
    }
    res.status(200).json(updated); // Include contractDate in response
  } catch (error) {
    res.status(500).json({ message: "Error updating contract", error });
  }
};

// @desc Delete a contract
exports.deleteContract = async (req, res) => {
  try {
    const deleted = await Contract.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Contract not found" });
    }
    res.status(200).json({ message: "Contract deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting contract", error });
  }
};

// @desc GET /api/contracts/:id/preview
exports.previewContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findById(id);

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    res.status(200).json({
      preview: {
        contractDate: contract.contractDate,
        buyer: contract.buyer,
        seller: contract.seller,
        grade: contract.grade,
        commodity: contract.commodity,
        priceExGST: contract.priceExGST,
        deliveryPeriod: contract.deliveryPeriod,
        deliveryDestination: contract.deliveryDestination,
        notes: contract.notes,
        specialCondition: contract.specialCondition,
        contractType: contract.contractType,
        createdAt: contract.createdAt,
      },
    });
  } catch (error) {
    console.error("Error previewing contract:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc GET /api/contracts/:id/export-pdf
exports.exportContractPDF = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Contract_${contract._id}.pdf`
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text("Contract Details", { align: "center" }).moveDown();

    Object.entries(contract.toObject()).forEach(([key, value]) => {
      if (value instanceof Date) {
        value = new Date(value).toLocaleDateString();
      } else if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value, null, 2);
      }
      doc.fontSize(12).text(`${key}: ${value}`);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

// @desc GET /api/contracts/:id/export-csv
exports.exportContractCSV = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate(
      "buyer seller"
    );

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const json = [contract.toObject()];
    const parser = new Parser({ flatten: true });
    const csv = parser.parse(json);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Contract_${contract.contractNumber}.csv`
    );
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating CSV" });
  }
};

// @desc Move to trash.
exports.softDeleteContract = async (req, res) => {
  const { id } = req.params;

  const contract = await Contract.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!contract) {
    return res.status(404).json({ message: "Contract not found" });
  }

  res.json({ message: "Moved to trash", contract });
};

// @desc restore.
exports.restoreContract = async (req, res) => {
  const { id } = req.params;

  const contract = await Contract.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );
  if (!contract) {
    return res.status(404).json({ msg: "Not found" });
  }

  res.json({ msg: "Restored", contract });
};

// @desc permanently delete
exports.hardDeleteContract = async (req, res) => {
  const { id } = req.params;

  const deleted = await Contract.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ msg: "Not found" });
  }

  res.json({ msg: "Permanently removed" });
};

// @desc list trash
exports.getDeletedContracts = async (req, res) => {
  const trash = await Contract.find({ isDeleted: true }).sort({
    deletedAt: -1,
  });
  res.json(trash);
};

exports.sendContractByEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipient } = req.body;

    const contract = await Contract.findById(id).populate("buyer seller");

    if (!contract)
      return res.status(404).json({ message: "Contract not found" });

    const target = recipient === "buyer" ? contract.buyer : contract.seller;

    if (!target) {
      console.log("Target not found (buyer or seller):", recipient);
      return res.status(400).json({ message: "Buyer/Seller not associated" });
    }

    if (!target.email)
      return res.status(400).json({ message: "Recipient email not available" });

    const bufferStream = new stream.PassThrough();
    const doc = new PDFDocument();
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      await sendEmail({
        to: target.email,
        subject: `Contract Details: ${contract.contractNumber}`,
        text: `Please find the contract attached.`,
        attachments: [
          {
            filename: `Contract_${contract.contractNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      res.status(200).json({ message: `Contract emailed to ${recipient}` });
    });

    doc.fontSize(20).text("Contract Details", { align: "center" }).moveDown();

    Object.entries(contract.toObject()).forEach(([key, value]) => {
      if (value instanceof Date) {
        value = new Date(value).toLocaleDateString();
      } else if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value, null, 2);
      }
      doc.fontSize(12).text(`${key}: ${value}`);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending email" });
  }
};
