const { Parser } = require("json2csv");
const DeliveredBid = require("../models/DeliveredBid");

exports.createOrUpdateDeliveredBid = async (req, res) => {
  try {
    console.log("Received req.body:", req.body); // Debug log

    const { label, season, date, monthlyValues } = req.body;

    if (!label || !season || !date) {
      return res
        .status(400)
        .json({ message: "label, season, and date are required." });
    }

    // Parse and validate date
    let parsedDate;
    try {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (error) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    // Prepare update payload
    const monthlyUpdates = {};
    const allowedMonths = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Validate and process monthlyValues
    if (monthlyValues && typeof monthlyValues === "object" && monthlyValues !== null) {
      console.log("Raw monthlyValues structure:", JSON.stringify(monthlyValues)); // Debug log
      // Use the keys directly from monthlyValues
      for (const key of Object.keys(monthlyValues)) {
        if (allowedMonths.includes(key)) {
          const value = monthlyValues[key];
          if (value !== undefined && value !== null) {
            monthlyUpdates[`monthlyValues.${key}`] = Number(value); // Convert to number
          }
        } else {
          console.warn(`Ignoring invalid month key: ${key}`);
        }
      }
    } else if (monthlyValues !== undefined) {
      return res.status(400).json({ message: "monthlyValues must be an object if provided." });
    }

    // Debug purpose
    console.log("Updating bid with payload:", { label, season, date: parsedDate, monthlyUpdates });

    const updatedBid = await DeliveredBid.findOneAndUpdate(
      { label, season, date: parsedDate },
      {
        $set: {
          ...monthlyUpdates,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ data: updatedBid });
  } 
  catch(error){
    console.error("Error in createOrUpdateDeliveredBid:", error); // Log full error
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveredBids = async (req, res) => {
  try {
    const { season, date } = req.query;

    const filter = {};

    // season filtering.
    if (season) {
      filter.season = season;
    }
    if (date) {
      filter.date = new Date(date);
    }

    const bids = await DeliveredBid.find(filter);
    res.status(200).json({ data: bids });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeliveredBid = async (req, res) => {
  try {
    const bid = await DeliveredBid.findById(req.params.id);
    if (!bid) return res.status(404).json({ message: "Not found" });
    res.json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDeliveredBid = async (req, res) => {
  try {
    await DeliveredBid.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export to csv

exports.exportDeliveredBidsCSV = async (req, res) => {
  try {
    const { season, startDate, endDate } = req.query;

    const filter = {};
    if (season) {
      filter.season = season;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: moment.utc(startDate).startOf('day').toDate(),
        $lte: moment.utc(endDate).endOf('day').toDate(),
      };
    }

    const bids = await DeliveredBid.find(filter).lean();

    if (!bids.length) {
      return res.status(404).json({ message: "No data found for export." });
    }

    // Flatten data for CSV
    const data = bids.map((bid) => ({
      Label: bid.label,
      Season: bid.season,
      ...bid.monthlyValues,
      UpdatedAt: bid.updatedAt,
    }));

    const fields = [
      "Label",
      "Season",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
      "UpdatedAt",
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`delivered_bids_${season || "all"}_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
