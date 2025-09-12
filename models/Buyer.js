const mongoose = require('mongoose');


const buyerSchema = new mongoose.Schema({
    name:          { type: String, required: true },           // Buyer name
    abn:           { type: String },
    email:         { type: String },
    accountNumber: { type: String },
    officeAddress: { type: String },
    contactName:   {type : [String]},
    phoneNumber:   { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }

  },{ timestamps: true }
);

module.exports = mongoose.model('Buyer', buyerSchema);