const Buyer = require('../models/Buyer');
const Seller = require('../models/Seller');
const Contract = require('../models/Contract');

exports.getTrashBin = async(req, res) => {
    const {type} = req.query;

    try{
        const result = {};

        if(!type || type === 'buyers'){
            result.buyers = await Buyer.find({ isDeleted: true });
        }

        if(!type || type === 'sellers'){
            result.sellers = await Seller.find({ isDeleted: true });
        }

        if(!type || type === 'contracts'){
            result.contracts = await Contract.find({ isDeleted: true });
        }

        res.status(200).json(result);
    }

    catch(error){
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
}

exports.bulkDeleteTrash = async(req, res) =>{
    const { buyers = [], sellers = [], contracts = []} = req.body;

    try{
        const buyerDelete = buyers.length > 0 ? await Buyer.deleteMany({_id: { $in: buyers } }) : null;
        const sellerDelete = sellers.length > 0 ? await Seller.deleteMany({_id: { $in: sellers } }) : null;
        const contractDelete = contracts.length > 0 ? await Contract.deleteMany({_id: { $in: contracts } }) : null;

        res.status(200).json({
            message: 'Bulk delete successful',
            deleted:{
                buyers: buyerDelete?.deletedCount || 0,
                sellers: sellerDelete?.deletedCount || 0,
                contracts: contractDelete?.deletedCount || 0,
            },
        });
    }

    catch(error){
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
}

exports.bulkRestoreTrash = async(req, res) =>{
    const {buyers = [], sellers = [], contracts = []} = req.body;

    try{
        const buyerRestore = buyers.length > 0 
            ? await Buyer.updateMany({_id: { $in: buyers }}, { isDeleted: false, deletedAt: null }) 
            : null;

        const sellerRestore = sellers.length > 0 
            ? await Seller.updateMany({_id: { $in: sellers }}, { isDeleted: false, deletedAt: null }) 
            : null;
        const contractRestore = contracts.length > 0 
            ? await Contract.updateMany({_id: { $in: contracts }}, { isDeleted: false, deletedAt: null }) 
            : null;

        res.status(200).json({
            message: 'Bulk restore successful',
            restored:{
                buyers: buyerRestore?.modifiedCount || 0,
                sellers: sellerRestore?.modifiedCount || 0,
                contracts: contractRestore?.modifiedCount || 0,
            },
        });
    }
    catch(error){
        console.error(error);
        res.status(500).json({message: 'Server error', error: error.message});
    }
}
