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

// move single Buyer to trash
exports.trashSeller = async (req, res) => {
  try {
    const b = await Seller.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Moved to rubbish bin', b });
  } catch (err) { res.status(500).json(err); }
};

// list trashed Buyers
exports.getTrashSellers = async (_req, res) => {
  try {
    const list = await Seller.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json(err); }
};

// restore Buyer
exports.restoreSeller = async (req, res) => {
  try {
    const b = await Seller.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Restored', b });
  } catch (err) { res.status(500).json(err); }
};

// permanent delete Buyer
exports.deleteSellerPermanent = async (req, res) => {
  try {
    await Seller.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permanently deleted' });
  } catch (err) { res.status(500).json(err); }
};

// 🗑️🔨 bulk permanent delete (?ids=comma,separated)
exports.bulkDeleteSellers = async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    await Seller.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${ids.length} buyers` });
  } catch (err) { res.status(500).json(err); }
};