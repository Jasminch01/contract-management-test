const Buyer = require('../models/Buyer');

exports.createBuyer = async(req, res) => {
    try {
        const buyer = await Buyer.create(req.body);
        res.status(201).json(buyer);    
    } 
    catch (error) {
        res.status(400).json({message: 'Buyer creation failed', error});
    }
}

exports.getBuyers = async(req, res) => {
    try {
        // const buyers = await Buyer.find().sort({ createdAt: -1});
        // res.json(buyers)
        const filter = req.query.filter;
        let query = { isDeleted: false };

        if(filter === 'last-week'){
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate()-7);
          query.createdAt = { $gte: lastWeek };
        }

        const buyers = await Buyer.find(query).sort({ createdAt: -1 });
        res.status(200).json(buyers);
    } 
    catch (error) {
        res.status(500).json(error);
    }
}

exports.getBuyer = async(req, res) => {
    try{
        const buyer = await Buyer.findById(req.params.id);
        if(!buyer){
            return res.status(404).json({message: 'Not found'})
        }

        res.json(buyer);
    }
    catch (err) {
        res.status(500).json(err);
    }
}

exports.updateBuyer = async(req, res) => {
  try {
    const buyer = await Buyer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!buyer) return res.status(404).json({ message: 'Not found' });
    res.json(buyer);
  } catch (err) {
    res.status(400).json(err);
  }
};

exports.deleteBuyer = async(req, res) => {
  try {
    await Buyer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Buyer deleted' });
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.searchBuyers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const buyers = await Buyer.find({
      $or: [
        { name: new RegExp(q, 'i') },
        { abn: new RegExp(q, 'i') }
      ]
    }).limit(10);
    res.json(buyers);
  } catch (err) {
    res.status(500).json(err);
  }
};

// move single Buyer to trash
exports.trashBuyer = async (req, res) => {
  try {
    const b = await Buyer.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Moved to rubbish bin', b });
  } catch (err) { res.status(500).json(err); }
};

// list trashed Buyers
exports.getTrashBuyers = async (_req, res) => {
  try {
    const list = await Buyer.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json(err); }
};

// restore Buyer
exports.restoreBuyer = async (req, res) => {
  try {
    const b = await Buyer.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Restored', b });
  } catch (err) { res.status(500).json(err); }
};

// permanent delete Buyer
exports.deleteBuyerPermanent = async (req, res) => {
  try {
    await Buyer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Permanently deleted' });
  } catch (err) { res.status(500).json(err); }
};

// 🗑️🔨 bulk permanent delete (?ids=comma,separated)
exports.bulkDeleteBuyers = async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    await Buyer.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${ids.length} buyers` });
  } catch (err) { res.status(500).json(err); }
};