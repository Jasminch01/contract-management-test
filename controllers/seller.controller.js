const Seller = require('../models/Seller');

exports.createSeller = async (req, res) => {
  try {
    const seller = await Seller.create(req.body);
    res.status(201).json(seller);
  } catch (err) {
    res.status(400).json({ message: 'Seller creation failed', err });
  }
};

exports.getSellers = async (_req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json(sellers);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.getSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: 'Not found' });
    res.json(seller);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.updateSeller = async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!seller) return res.status(404).json({ message: 'Not found' });
    res.json(seller);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.deleteSeller = async (req, res) => {
  try {
    await Seller.findByIdAndDelete(req.params.id);
    res.json({ message: 'Seller deleted' });
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.searchSellers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const sellers = await Seller.find({
      $or: [
        { legalName: new RegExp(q, 'i') },
        { abn: new RegExp(q, 'i') }
      ]
    }).limit(10);
    res.json(sellers);
  } catch (err) {
    res.status(500).json(err);
  }
};
