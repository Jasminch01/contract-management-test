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
app.use('/api/contracts', contractRoutes);
app.use('/api/buyers',  buyerRoutes);
app.use('/api/sellers', sellerRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
})