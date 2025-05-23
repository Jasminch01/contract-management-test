const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv')

// importing external files.
const connectDB = require('./config/db.js');
const contractRoutes = require('./routes/contract.routes.js');
const path = require('path');
const buyerRoutes = require('./routes/buyer.routes.js')
const sellerRoutes = require('./routes/seller.routes.js');
const trashRoutes = require('./routes/trash.js');
const priceBidRoutes = require('./routes/priceBidRoutes.js');
const deliveredBidRoutes = require('./routes/deliveredBidRoutes.js');
const authRoutes = require('./routes/auth.js');
const authMiddleware = require('./middelwares/authMiddleware.js');



dotenv.config();
connectDB();

// creating app instance.
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Contract API route
app.use('/api/auth', authRoutes);
app.use('/api/contracts', authMiddleware, contractRoutes);
app.use('/api/buyers', authMiddleware, buyerRoutes);
app.use('/api/sellers', authMiddleware, sellerRoutes);
app.use('/api', authMiddleware, trashRoutes);
app.use('/api/price-bids', authMiddleware, priceBidRoutes);
app.use('/api/delivered-bids', authMiddleware, deliveredBidRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
})