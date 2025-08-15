const { Parser, parse } = require("json2csv");
const PortZoneBid = require("../models/PortZoneBid");
const moment = require("moment");

// Create or update port zone bid by label+season+date
exports.createOrUpdatePortZoneBid = async (req, res) => {
  try {
    const { label, season, date } = req.body;

    if (!label || !season || !date) {
      return res
        .status(400)
        .json({ message: "label, season, and date are required." });
    }

    // Use moment for consistent UTC handling
    const parsedDate = moment.utc(date);
    const startOfDay = parsedDate.clone().startOf("day").toDate();
    const endOfDay = parsedDate.clone().endOf("day").toDate();

    //This way, any stored date in that day will match regardless.
    const updatedBid = await PortZoneBid.findOneAndUpdate(
      { label, season, date: { $gte: startOfDay, $lt: endOfDay } }, // match combination
      req.body,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({data : updatedBid});
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Duplicate entry for label, season and date" });
    }
    console.log(error)
    res.status(500).json({ message: error.message });
  }
};

// Get all port zone bids (with query support)
exports.getPortZoneBids = async (req, res) => {
  try {
    const { season, date, startDate, endDate } = req.query;
    const filter = {};
    // Filter by season (e.g., 24/25)
    if (season) {
      filter.season = season;
    }

    // Filter by specific date (matches same calendar day on updatedAt)
    if (date) {
      const parsedDate = moment.utc(date).startOf('day').toDate();
      const nextDay = moment.utc(parsedDate).add(1, 'day').toDate();

      filter.date = {
        $gte: parsedDate,
        $lt: nextDay,
      };
    }

    // Filter by range (startDate to endDate)
    if (startDate && endDate) {
      const start = moment.utc(startDate).startOf('day').toDate();
      const end = moment.utc(endDate).endOf('day').toDate();

      filter.updatedAt = {
        $gte: start,
        $lte: end,
      };
    }

    // for debugging.
    console.log("Filter being applied:", filter);


    const bids = await PortZoneBid.find(filter);
    res.status(200).json({data: bids || []});
  } catch (error) {
    console.error("Error fetching Port Zone Bids:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get specific port zone bid by ID
exports.getPortZoneBid = async (req, res) => {
  try {
    const bid = await PortZoneBid.findById(req.params.id);
    if (!bid) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json({data : bid});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a port zone bid
exports.deletePortZoneBid = async (req, res) => {
  try {
    await PortZoneBid.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export port zone bids to CSV
exports.exportPortZoneBidsCSV = async (req, res) => {
  // try {
    const { season, startDate, endDate } = req.query;
console.log(season, startDate, endDate)
  //   const filter = {};
  //   if (season) {
  //     filter.season = season;
  //   }
  //   if (startDate && endDate) {
  //     filter.updatedAt = {
  //       $gte: new Date(startDate),
  //       $lte: new Date(endDate),
  //     };
  //   }

  //   const bids = await PortZoneBid.find(filter).lean();

  //   if (!bids.length) {
  //     return res.status(404).json({ message: "No data found for export." });
  //   }

  //   const bidTypes = [
  //     "APW1",
  //     "H1",
  //     "H2",
  //     "AUH2",
  //     "ASW1",
  //     "AGP1",
  //     "SFW1",
  //     "BAR1",
  //     "MA1",
  //     "CM1",
  //     "COMD",
  //     "CANS",
  //     "FIEV",
  //     "NIP/HAL",
  //   ];

  //   const data = bids.map((bid) => {
  //     const row = {
  //       PortZone: bid.label,
  //       Season: bid.season,
  //       UpdatedAt: bid.updatedAt,
  //     };

  //     bidTypes.forEach((type) => {
  //       row[type] = bid[type] || "";
  //     });

  //     return row;
  //   });

  //   const fields = ["PortZone", "Season", ...bidTypes, "UpdatedAt"];
  //   const parser = new Parser({ fields });
  //   const csv = parser.parse(data);

  //   res.header("Content-Type", "text/csv");
  //   res.attachment(`port_zone_bids_${season || "all"}_${Date.now()}.csv`);
  //   return res.send(csv);
  // } catch (error) {
  //   res.status(500).json({ message: error.message });
  // }
};
