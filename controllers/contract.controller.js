const Contract = require('../models/Contract');

// @desc Create a new contract.
exports.createContract = async(req, res) => {
    try {
        const data = req.body;
        
        if(req.file){
            data.attachedSellerContract = req.file.filename;
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
exports.deleteContract = async (req, res) => {
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