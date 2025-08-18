const PDFDocument = require("pdfkit");
const Contract = require("../models/Contract");
const { mongo, default: mongoose } = require("mongoose");
const { Parser } = require("json2csv");
const { sendEmail } = require("../utils/mailer");
const stream = require("stream");

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
    console.log(error);
    res.status(500).json({ message: "Error creating contract", error });
  }
};

// @desc Get all contracts
exports.getAllContracts = async (req, res) => {
  try {
    const {
      commodity,
      grade,
      contractNumber,
      tonnesMin,
      tonnesMax,
      buyerId,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortDir = "desc",
    } = req.query;

    const filter = { isDeleted: false };

    if (commodity) {
      filter.commodity = new RegExp(commodity, "i");
    }

    if (grade) {
      filter.grade = grade;
    }

    if (contractNumber) {
      filter.contractNumber = contractNumber.toUpperCase();
    }

    if (buyerId && mongoose.Types.ObjectId.isValid(buyerId)) {
      filter.buyerId = buyerId;
    }

    if (tonnesMin || tonnesMax) {
      filter.weights = {};

      if (tonnesMin) {
        filter.weights.$gte = Number(tonnesMin);
      }
      if (tonnesMax) {
        filter.weights.$lte = Number(tonnesMax);
      }
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortDir === "asc" ? 1 : -1 };

    const [data, total] = await Promise.all([
      Contract.find(filter)
        .populate("buyer seller")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Contract.countDocuments(filter),
    ]);

    res.json({
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
      data,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching contracts", error });
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