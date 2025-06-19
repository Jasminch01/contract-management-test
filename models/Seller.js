const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
    legalName:        { type: String, required: true },
    abn:              { type: String },
    additionalNgrs:   { type: [String] },
    accountNumber:    { type: String },
    email:            { type: String },
    authorityToAct:   { type: String },      // file URL or filename
    address:          { type: String },
    mainNgr:          { type: String },
    contactName:      { type: String },
    locationZone:     { type: String },
    phoneNumber:      { type: String },
    locationZone:{
        type: [String], // Multi-select zones
        default: [],
    },
    authorityActFormPdf: {
        type: String, // store the file path or URL
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
},
{ timestamps: true });

module.exports = mongoose.model('Seller', sellerSchema);
