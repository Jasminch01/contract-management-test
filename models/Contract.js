const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractDate: Date,
  deliveryPeriod: {
    start: Date,
    end: Date
  },
  buyerContractReference: String,
  sellerContractReference: String,
  grade: String,
  buyer: String,
  seller: String,
  attachedSellerContract: String, // File URL or name
  contractType: String,
  NGRNumber: String,
  deliveryOption: String,
  freight: String,
  weights: String,
  priceExGST: String,
  conveyance: String,
  commodity: String,
  paymentTerms: String,
  brokerRate: String,
  deliveryDestination: String,
  brokeragePayableBy: String,
  specialCondition: String,
  termsAndConditions: String,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contract', contractSchema);
