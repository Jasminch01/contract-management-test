const Contract = require("../models/Contract");
const moment = require("moment");

const calculateCommission = (contracts) => {
  return contracts.reduce((sum, contract) => {
    // Only process completed contracts
    if (contract.status === "Complete") {
      const rate = parseFloat(contract.brokerRate) || 0;
      const tonnes = parseFloat(contract.tonnes) || 0;
      let multiplier = 0;

      // Check who pays brokerage
      if (
        contract.brokeragePayableBy === "Buyer & Seller" ||
        contract.brokeragePayableBy === "Seller & Buyer"
      ) {
        multiplier = 2;
      } else if (
        contract.brokeragePayableBy === "Buyer" ||
        contract.brokeragePayableBy === "Seller"
      ) {
        multiplier = 1;
      }
      // If no valid brokerage payable, multiplier remains 0

      return sum + rate * tonnes * multiplier;
    }

    return sum;
  }, 0);
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const weekStart = moment().startOf("isoWeek");

    const allContracts = await Contract.find({ isDeleted: false });
    const todayContracts = allContracts.filter((c) =>
      moment(c.contractDate ? c.contractDate : c.createdAt).isSame(today, "day")
    );
    const weekContracts = allContracts.filter((c) =>
      moment(c.contractDate ? c.contractDate : c.createdAt).isSameOrAfter(
        weekStart
      )
    );

    const dailyCommission = calculateCommission(todayContracts);
    const weeklyCommssion = calculateCommission(weekContracts);
    const completed = allContracts.filter((c) => c.status === "Complete");
    const incomplete = allContracts.filter((c) => c.status === "Incomplete");

    res.json({
      dailyCommission,
      weeklyCommssion,
      totalContracts: allContracts.length,
      completedContracts: completed.length,
      uncompleteContracts: incomplete.length,
      todayContracts: todayContracts.length,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching dashboard summary", error });
  }
};

exports.getHistoricalData = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const contracts = await Contract.find({
      createdAt: { $gte: today.clone().subtract(7, "days") },
      isDeleted: false,
    }).sort({ createdAt: -1 });

    const formatItem = (c) => ({
      contractNumber: c.contractNumber,
      contractName: c.commodity,
      time: moment(c.createdAt).format("hh:mm A"),
      commission: calculateCommission([c]),
      price: c.priceExGST,
    });

    const historicalData = contracts.map(formatItem);

    res.json({
      historicalCommissions: historicalData,
      historicalContracts: historicalData,
      historicalPrices: historicalData,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching historical data", err });
  }
};

exports.getProgressChartData = async (req, res) => {
  try {
    const contracts = await Contract.find({ isDeleted: false });
    const done = contracts.filter((c) => c.status === "Complete").length;
    const notDone = contracts.length - done;

    res.json({
      data: { done: done, notDone: notDone },
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching progress data", err });
  }
};
