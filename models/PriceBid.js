const mongoose = require('mongoose');

const priceBidSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        index: true
    },
    portZone: {
        type: String,
        required: true,
    },
    grade:{
        type: String,
        required: true,
    },
    price:{
        type: Number,
        required: true,
    },
    source:{
        type: String,
    },
    notes:{
        type: String,
    }
},
{
    timestamps: true
});

priceBidSchema.index({date: 1, portZone: 1, grade: 1}, {unique: true});

module.exports= mongoose.model('PriceBid', priceBidSchema);