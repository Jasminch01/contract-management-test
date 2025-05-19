const mongoose = require('mongoose');
const Buyer = require('./Buyer.js');
const Seller = require('./Seller.js');
const Counter  = require('./Counter');

const contractSchema = new mongoose.Schema({
  contractDate: Date,
  deliveryPeriod: {
    start: Date,
    end: Date
  },
  contractNumber: { type: String, unique: true, index: true },
  buyerContractReference: String,
  sellerContractReference: String,
  grade: String,
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  attachedSellerContract: String, // File URL or name
  attachedBuyerContract: String,  // File URL or name
  contractType: String,
  NGRNumber: String,
  deliveryOption: String,
  freight: String,
  weights: String,
  priceExGST: String,
  conveyance: String,
  commodity: String,
  certificationScheme:   String,
  paymentTerms: String,
  brokerRate: String,
  deliveryDestination: String,
  brokeragePayableBy: String,
  specialCondition: String,
  termsAndConditions: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted:   { type: Boolean, default: false },
  deletedAt:   { type: Date },
  status: {
    type: String,
    enum: ['Incomplete', 'Complete', 'Invoiced'],
    default: 'Incomplete',
    index: true
  },
});

contractSchema.pre('save', async function (next) {
  if (this.isNew && !this.contractNumber) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        'contract',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const padded = String(counter.seq).padStart(4, '0'); // 0001
      this.contractNumber = `ZJ${padded}`;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Contract', contractSchema);
