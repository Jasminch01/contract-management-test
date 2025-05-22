const mongoose = require('mongoose');

const deliveredBidSchema = new mongoose.Schema({
    month:{
        type: String,
        required: true,
    },
    deliveryZone:{
        type: String,
        required: true,
    },
    commodity:{
        type: String,
        required: true,
    },
    averagePrice:{
        type: Number,
        required: true,
    },
    minPrice:{
        type: Number,
    },
    maxPrice:{
        typeL: Number,
    },
    volume:{
        type: Number,
    },
    notes:{
        type: String,
    }
},
{
    timestamps: true,
});

deliveredBidSchema.index({ month: 1, deliveryZone: 1, commodity: 1 }, { unique: true });

module.exports = mongoose.model('DeliveredBid', deliveredBidSchema);