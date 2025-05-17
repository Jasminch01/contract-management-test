const mongoose = require('mongoose');
const Buyer = require('./Buyer.js');
const Seller = require('./Seller.js')

const contractSchema = new mongoose.Schema({
  contractDate: Date,
  deliveryPeriod: {
    start: Date,
    end: Date
  },
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
  deletedAt:   { type: Date }
});

module.exports = mongoose.model('Contract', contractSchema);
