const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const SECRET = process.env.JWT_SECRET || "supersecret";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "1d" });

  // Different settings for development vs production
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction, // Only secure in production
    sameSite: isProduction ? "none" : "lax", // "none" requires secure
  });

  res.json({
    success: true,
    statusCode: 200,
    message: "user login successfully",
    data: user,
  });
});
// router.post("/register", async (req, res) => {
//   try {
//     const { email, password, name } = req.body;

//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     // Create new user
//     const user = new User({
//       email,
//       password,
//       name,
//       isFirstLogin: true,
//     });

//     await user.save();

//     console.log("User created:", user);

//     // Generate token for immediate login after registration
//     const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "1d" });

//     res.status(201).json({
//       message: "User created successfully",
//       token,
//       isFirstLogin: user.isFirstLogin,
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({ message: "Server error during registration" });
//   }
// });

router.post("/update-credentials", async (req, res) => {
  const { id } = jwt.verify(req.headers.authorization.split(" ")[1], SECRET);

  const { email, password } = req.body;
  const user = await User.findOne({ _id: id });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.email = email;
  user.password = password;
  user.isFirstLogin = false;
  await user.save();

  res.json({ message: "Credentials updated." });
});

router.post("/logout", async (req, res) => {
  res.clearCookie("token", { path: "/", httpOnly: false, secure: false }); //secure for prod : true
  res.json({
    success: true,
    statusCode: 200,
    message: "logged out successfully",
    data: "logged out successfully",
  });
});

module.exports = router;
