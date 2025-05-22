const PriceBid = require('../models/PriceBid');

exports.createPriceBid = async (req, res) => {
  try {
    const priceBid = await PriceBid.create(req.body);
    res.status(201).json(priceBid);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPriceBids = async (req, res) => {
  try {
    const bids = await PriceBid.find(req.query);
    res.status(200).json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPriceBid = async (req, res) => {
  try {
    const bid = await PriceBid.findById(req.params.id);
    if (!bid) return res.status(404).json({ message: 'Not found' });
    res.json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePriceBid = async (req, res) => {
  try {
    const updated = await PriceBid.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePriceBid = async (req, res) => {
  try {
    await PriceBid.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};