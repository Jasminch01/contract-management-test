const mongoose = require('mongoose');

const portZoneBidSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: [
        'Outer Harbor',
        'Port Lincoln',
        'Port Giles',
        'Wallaroo',
        'Lucky Bay',
        'Thevenard',
        'Wallaroo Tports',
      ],
      required: true,
    },
    season: {
      type: String,
      required: true,
      match: /^\d{2}\/\d{2}$/, // e.g., 24/25
    },
    date: {
      type: Date,
      required: true,
    },
    // Bid types (editable fields)
    APW1: { type: Number, default: null },
    H1: { type: Number, default: null },
    H2: { type: Number, default: null },
    AUH2: { type: Number, default: null },
    ASW1: { type: Number, default: null },
    AGP1: { type: Number, default: null },
    SFW1: { type: Number, default: null },
    BAR1: { type: Number, default: null },
    MA1: { type: Number, default: null },
    CM1: { type: Number, default: null },
    COMD: { type: Number, default: null },
    CANS: { type: Number, default: null },
    FIEV: { type: Number, default: null },
    'NIP/HAL': { type: Number, default: null },

    // Optional: user tracking (if needed)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

portZoneBidSchema.index({ label: 1, season: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('PortZoneBid', portZoneBidSchema);
