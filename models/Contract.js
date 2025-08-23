  const mongoose = require("mongoose");
  const Buyer = require("./Buyer.js");
  const Seller = require("./Seller.js");
  const Counter = require("./Counter");

  const contractSchema = new mongoose.Schema({
    contractDate: {
      type: Date,
      required: true,
    },
    deliveryPeriod: {
      start: Date,
      end: Date,
    },
    contractNumber: { type: String, unique: true, index: true },
    buyerContractReference: String,
    sellerContractReference: String,
    grade: String,
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "Buyer" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
    attachedSellerContract: String, // File URL or name
    attachedBuyerContract: String, // File URL or name
    contractType: String,
    ngrNumber: String,
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
    brokeragePayableBy: String,
    specialCondition: String,
    termsAndConditions: String,
    notes: String,
    tonnes: {
      type: Number,
      required: true,
    },
    tolerance: {
      type: String, // or Number depending on UI
      required: false,
    },
    season: {
      type: String,
      required: true,
    },
    brokeragePayableBy: {
      type: String,
      enum: ["Buyer", "Seller", "Buyer & Seller", "Seller & Buyer", "No Brokerage Payable"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    status: {
      type: String,
      enum: ["Incomplete", "Complete", "Invoiced"],
      default: "Incomplete",
      index: true,
    },
    contractType: { type: String },
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
