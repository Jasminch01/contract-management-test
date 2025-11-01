const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

// importing external files.
const connectDB = require("./config/db.js");
const contractRoutes = require("./routes/contract.routes.js");
const buyerRoutes = require("./routes/buyer.routes.js");
const sellerRoutes = require("./routes/seller.routes.js");
const trashRoutes = require("./routes/trash.js");
const portZoneBids = require("./routes/portZoneBidRoutes.js");
const deliveredBidRoutes = require("./routes/deliveredBidRoutes.js");
const authRoutes = require("./routes/auth.js");
const authMiddleware = require("./middelwares/authMiddleware.js");
const dashboardRoutes = require("./routes/dashboardRoutes.js");
const xeroRoutes = require("./routes/xero.js");

dotenv.config();
connectDB();

// creating app instance.
const app = express();

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://contract-management-livid.vercel.app",
      "https://contract-management-test-client.vercel.app",
      "https://contract-management-server-pajyejvow-jasmin-chakmas-projects.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Contract API route
app.use("/api/auth", authRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/buyers", authMiddleware, buyerRoutes);
app.use("/api/sellers", authMiddleware, sellerRoutes);
app.use("/api", authMiddleware, trashRoutes);
app.use("/api/portZone-bids", authMiddleware, portZoneBids);
app.use("/api/delivered-bids", authMiddleware, deliveredBidRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api", xeroRoutes);

app.use("/", (req, res) => {
  // console.log("API is running");
  res.json({ message: "API is running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
