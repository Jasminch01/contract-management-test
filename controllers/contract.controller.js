const PDFDocument = require('pdfkit')
const Contract = require('../models/Contract');

// @desc Create a new contract.
exports.createContract = async(req, res) => {
    try {
        const data = req.body;
        
        if(req.files){
            if(req.files.attachedSellerContract)
              data.attachedSellerContract = req.files.attachedSellerContract[0].filename;
            if(req.files.attachedBuyerContract)
              data.attachedBuyerContract  = req.files.attachedBuyerContract[0].filename;
        }

        const contract = new Contract(data);

        await contract.save();
        res.status(201).json(contract);
    } 
    catch (error) {
        res.status(500).json({ message: 'Error creating contract', error });
    }
};

// @desc Get all contracts
exports.getAllContracts = async(req, res) => {
  try {
    const contracts = await Contract.find();
    res.status(200).json(contracts);
  }
  catch (error) {
    res.status(500).json({ message: 'Error fetching contracts', error });
  }
};

// @desc Get a single contract
exports.getContractById = async(req, res) => {
    try{
        const contract = await Contract.findById(req.params.id);

        if(!contract){
            return res.status(404).json({ message: 'Contract not found' });
        }

        res.status(200).json(contract);
    }
    catch(error){
        res.status(500).json({ message: 'Error fetching contract', error });
    }
};

// @desc Update a contract by id.
exports.updateContract = async(req, res) => {
    try {
        const data = req.body;

        if(req.file){
            data.attachedSellerContract = req.file.filename;
        }

        const updated = await Contract.findByIdAndUpdate(req.params.id, data, {new: true});

        if(!updated){
            return res.status(400).json({message: 'Contract not found'});
        }

        res.status(200).json(updated);
    } 
    catch (error) {
        res.status(500).json({ message: 'Error updating contract', error });
    }
};

// @desc Delete a contract
exports.deleteContract = async(req, res) => {
  try {
    const deleted = await Contract.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    res.status(200).json({ message: 'Contract deleted successfully' });
  } 
  catch (error) {
    res.status(500).json({ message: 'Error deleting contract', error });
  }
};

// @desc GET /api/contracts/:id/preview
exports.previewContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findById(id);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    res.status(200).json({
      preview: {
        contractDate: contract.contractDate,
        buyer: contract.buyer,
        seller: contract.seller,
        grade: contract.grade,
        commodity: contract.commodity,
        priceExGST: contract.priceExGST,
        deliveryPeriod: contract.deliveryPeriod,
        deliveryDestination: contract.deliveryDestination,
        notes: contract.notes,
        specialCondition: contract.specialCondition,
        contractType: contract.contractType,
        createdAt: contract.createdAt
      }
    });
  } catch (error) {
    console.error('Error previewing contract:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc GET /api/contracts/:id/export-pdf
exports.exportContractPDF = async(req, res) => {
  try{
    const contract = await Contract.findById(req.params.id);

    if(!contract){
      return res.status(404).json({message: 'Contract not found'});
    }

    // Set headers for download.
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Destination',
      `attachment; filename=Contract_${contract._id}.pdf`
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    // Add Title
    doc.fontSize(20).text("Contract Details", { align:'center' }).moveDown();

    // List all Contract field
    Object.entries(contract.toObject()).forEach(([key, value]) => {
      // Format dates.
      if(value instanceof Date){
        value = new Date(value).toLocaleDateString();
      }
      else if(typeof value === 'object' && value !== null){
        value = JSON.stringify(value, null, 2);
      }

      doc.fontSize(12).text(`${key}: ${value}`);
    });

    doc.end();
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating PDF' });
  }
}

// @desc Move to trash.
exports.softDeleteContract = async(req, res) => {
  const { id } = req.params;

  const contract = await Contract.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    {new: true}
  );

  if(!contract){
    return res.status(404).json({message: 'Contract not found'});
  }

  res.json({message: 'Moved to trash', contract});
}

// @desc restore.
exports.restoreContract = async(req, res) => {
  const {id} = req.params;

  const contract = await Contract.findByIdAndUpdate(
    id,
    {isDeleted: false, deletedAt: null},
    {new: true}
  );
  if(!contract){
    return res.status(404).json({ msg: 'Not found' });
  }

  res.json({ msg: 'Restored', contract });
}

// @desc permanently delete
exports.hardDeleteContract = async (req, res) => {
  const { id } = req.params;

  const deleted = await Contract.findByIdAndDelete(id);
  if(!deleted){
    return res.status(404).json({ msg: 'Not found' });
  }

  res.json({ msg: 'Permanently removed' });
};

// @desc list trash
exports.getDeletedContracts = async(req, res) => {
  const trash = await Contract.find({ isDeleted: true }).sort({ deletedAt: -1 });
  res.json(trash);
};