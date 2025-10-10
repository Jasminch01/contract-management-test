const mongoose = require('mongoose');

const deliveredBidSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
    },
    season:{
        type: String,
        required: true
    },
    date:{
        type: Date,
        required: true
    },
    monthlyValues: {
        January: { type: Number, default: null },
        February: { type: Number, default: null },
        March: { type: Number, default: null},
        April: { type: Number, default: null },
        May: { type: Number, default: null },
        June: { type: Number, default: null },
        July: { type: Number, default: null },
        August: { type: Number, default: null },
        September: { type: Number, default: null},
        October: { type: Number, default: null },
        November: { type: Number, default: null},
        December: { type: Number, default: null },
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

deliveredBidSchema.index({label: 1, season: 1, date: 1}, {unique: true});

module.exports = mongoose.model('DeliverdBid', deliveredBidSchema);