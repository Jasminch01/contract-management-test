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
        const buyers = await Buyer.find().sort({ createdAt: -1});
        res.json(buyers)
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