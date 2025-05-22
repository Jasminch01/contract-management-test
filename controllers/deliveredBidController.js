const DeliveredBid = require('../models/DeliveredBid');

exports.createDeliveredBid = async (req, res) => {
  try {
    const bid = await DeliveredBid.create(req.body);
    res.status(201).json(bid);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getDeliveredBids = async (req, res) => {
  try {
    const bids = await DeliveredBid.find(req.query);
    res.status(200).json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveredBid = async (req, res) => {
  try {
    const bid = await DeliveredBid.findById(req.params.id);
    if (!bid) return res.status(404).json({ message: 'Not found' });
    res.json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDeliveredBid = async (req, res) => {
  try {
    const updated = await DeliveredBid.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDeliveredBid = async (req, res) => {
  try {
    await DeliveredBid.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};