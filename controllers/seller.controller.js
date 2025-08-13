const Seller = require('../models/Seller');

exports.createSeller = async(req, res) =>{
  try{
    const{
      legalName,
      abn,
      additionalNgrs,
      accountNumber,
      email,
      authorityActFormPdf,
      address,
      mainNgr,
      contactName,
      phoneNumber,
      locationZone,
      bulkHandlerCredentials
    } = req.body;

    // If sent as JSON string (from frontend form submission)
    const parsedBulkHandlerCredentials = typeof bulkHandlerCredentials === 'string'
      ? JSON.parse(bulkHandlerCredentials)
      : bulkHandlerCredentials;

    // const authorityActFormPdfFile = req.files?.authorityActFormPdf?.[0];
    // const authorityActFormPdfPath = authorityActFormPdfFile
    //   ? `{req.protocol}://${req.get('host')}/uploads/${authorityActFormPdfFile.filename}`
    //   : null;

    const seller = await Seller.create({
      legalName,
      abn,
      additionalNgrs: Array.isArray(additionalNgrs) ? additionalNgrs : [additionalNgrs],
      accountNumber,
      email,
      // authorityToAct,
      address,
      mainNgr,
      contactName,
      phoneNumber,
      locationZone: Array.isArray(locationZone) ? locationZone : [locationZone],
      authorityActFormPdf,
      bulkHandlerCredentials: parsedBulkHandlerCredentials,
    });

    res.status(201).json({
      message: 'Seller created successfully', seller
    });
  } 
  catch(err){
    console.error('Error creating seller:', err);
    res.status(400).json({ message: 'Seller creation failed', error: err.message });
  }
};


exports.getSellers = async (req, res) => {
  try {
    const filter = req.query.filter;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    let query = { isDeleted: false };

    if(filter === 'last-week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      query.createdAt = { $gte: lastWeek };
    }

    const skip = (page -1) * limit;

    const [sellers, total] = await Promise.all([
      Seller.find(query)
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit),
      Seller.countDocuments(query)
    ])
    res.status(200).json({
      page,
      totalPages: Math.ceil(total / limit),
      data: sellers
    })
  } 
  catch(err){
    res.status(500).json({message: 'Error fetching sellers', error: err});
  }
};

exports.getSeller = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if(!seller) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(seller);
  }
  catch(err){
    res.status(500).json(err);
  }
};

exports.updateSeller = async (req, res) => {
  try{
    const seller = await Seller.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if(!seller){
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(seller);
  } 
  catch(err){
    res.status(400).json(err);
  }
};

exports.deleteSeller = async (req, res) => {
  try {
    await Seller.findByIdAndDelete(req.params.id);
    res.json({ message: 'Seller deleted' });
  } 
  catch(err){
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

// move single Seller to trash
exports.trashSeller = async (req, res) => {
  try {
    const b = await Seller.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if(!b){
       return res.status(404).json({ message: 'Not found' });
    }
    res.json({ message: 'Moved to rubbish bin', b });
  }
  catch(err){ 
    res.status(500).json(err); 
  }
};

// list trashed Sellers
exports.getTrashSellers = async (_req, res) => {
  try {
    const list = await Seller.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json(err); }
};

// restore Seller
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

// permanent delete Seller
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