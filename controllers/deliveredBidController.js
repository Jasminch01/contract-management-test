const { Parser } = require('json2csv');
const DeliveredBid = require('../models/DeliveredBid');

exports.createDeliveredBid = async (req, res) => {
  try {
    const {label, season,  monthlyValues} = req.body;
    
    const bid = await DeliveredBid.create({labe, season, monthlyValues});

    res.status(201).json(bid);
  } 
  catch(error){
    res.status(400).json({ message: error.message });
  }
};

exports.getDeliveredBids = async (req, res) => {
  try {
    const {season, startDate, endDate} = req.query;

    const filter = {};

    // season filtering.
    if(season){
      filter.season = season;
    }

    // start date and end date filtering.
    if(startDate && endDate){
      filter.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bids = await DeliveredBid.find(filter);
    res.status(200).json(bids);
  } 
  catch(error){
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
    const allowedMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyUpdates = {};

    for(const key of allowedMonths){
      if(req.body[key] !== undefined){
        monthlyUpdates[`monthlyValues.${key}`] = req.body[key];
      }
    }

    const updated = await DeliveredBid.findByIdAndUpdate(
      req.params.id,
      {
        $set: monthlyUpdates,
        updatedAt: new Date()
      },
      {new: true}
    );

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDeliveredBid = async(req, res) =>{
  try{
    await DeliveredBid.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } 
  catch(error){
    res.status(500).json({ message: error.message });
  }
};


// Export to csv

exports.exportDeliveredBidsCSV = async(req, res) => {
  try {
    const { season, startDate, endDate } = req.query;

    const filter = {};
    if(season){
      filter.season = season;
    }

    if(startDate && endDate){
      filter.updatedAt ={
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bids = await DeliveredBid.find(filter).lean();

    if(!bids.length){
      return res.status(404).json({ message: 'No data found for export.' });
    }

    // Flatten data for CSV
    const data = bids.map(bid =>({
      Label: bid.label,
      Season: bid.season,
      ...bid.monthlyValues,
      UpdatedAt: bid.updatedAt
    }));

    const fields = ['Label', 'Season', 'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December', 'UpdatedAt'];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`delivered_bids_${season || 'all'}_${Date.now()}.csv`);
    return res.send(csv);
  } 
  catch(error){
    res.status(500).json({ message: error.message });
  }
};

