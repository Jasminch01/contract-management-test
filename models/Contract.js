const mongoose = require("mongoose");
const Buyer = require("./Buyer.js");
const Seller = require("./Seller.js");
const Counter = require("./Counter");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  { _id: false }
);

const contractSchema = new mongoose.Schema({
  contractDate: {
    type: Date,
    required: function () {
      return this.status !== "Draft";
    },
  },
  deliveryPeriod: {
    start: Date,
    end: Date,
  },
  xeroInvoiceId: {
    type: String,
    default: null,
  },
  xeroInvoiceNumber: {
    type: String,
    default: null,
  },
  contractNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents with null/undefined values
    index: true,
  },
  buyerContractReference: String,
  sellerContractReference: String,
  grade: String,
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Buyer",
    required: function () {
      return this.status !== "Draft";
    },
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Seller",
    required: function () {
      return this.status !== "Draft";
    },
  },
  attachedSellerContract: String, // File URL or name
  attachedBuyerContract: String, // File URL or name
  contractType: String,
  ngrNumber: String,
  buyerContact: contactSchema,
  sellerContact: contactSchema,
  deliveryOption: String,
  freight: String,
  weights: String,
  priceExGST: String,
  conveyance: String,
  commodity: String,
  certificationScheme: String,
  paymentTerms: String,
  brokerRate: String,
  deliveryDestination: String,
  specialCondition: String,
  termsAndConditions: String,
  notes: String,
  tonnes: {
    type: Number,
    required: function () {
      return this.status !== "Draft";
    },
  },
  tolerance: {
    type: String, // or Number depending on UI
    required: false,
  },
  season: {
    type: String,
    required: function () {
      return this.status !== "Draft";
    },
  },
  brokeragePayableBy: {
    type: String,
    enum: [
      "Buyer",
      "Seller",
      "Buyer & Seller",
      "Seller & Buyer",
      "No Brokerage Payable",
    ],
    required: function () {
      return this.status !== "Draft";
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["Draft", "Incomplete", "Complete", "Invoiced"],
    default: "Incomplete",
    index: true,
  },
});

// Pre-save middleware to update the updatedAt field
contractSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware for validation based on status
contractSchema.pre("save", function (next) {
  // If status is changing from Draft to another status, validate required fields
  if (this.isModified("status") && this.status !== "Draft") {
    const requiredFields = [
      "contractDate",
      "buyer",
      "seller",
      "tonnes",
      "season",
      "brokeragePayableBy",
    ];

    for (let field of requiredFields) {
      if (!this[field]) {
        const error = new Error(
          `${field} is required when status is ${this.status}`
        );
        error.name = "ValidationError";
        return next(error);
      }
    }
  }
  next();
});

// contractSchema.pre("save", async function (next) {
//   if (this.isNew && !this.contractNumber) {
//     try {
//       const counter = await Counter.findByIdAndUpdate(
//         "contract",
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true }
//       );
//       const padded = String(counter.seq).padStart(4, "0"); // 0001
//       this.contractNumber = `ZJ${padded}`;
//       next();
//     } catch (err) {
//       next(err);
//     }
//   } else {
//     next();
//   }
// });

module.exports = mongoose.model("Contract", contractSchema);
