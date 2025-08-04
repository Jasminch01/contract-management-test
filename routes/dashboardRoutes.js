// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/historical', dashboardController.getHistoricalData);
router.get('/progress', dashboardController.getProgressChartData);

module.exports = router;
