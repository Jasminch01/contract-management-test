const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "supersecret";

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  let token;

  // Handle both "Bearer token" and direct token formats
  if (authHeader.includes(" ")) {
    // Format: "Bearer <token>"
    token = authHeader.split(" ")[1];
  } else {
    // Format: "<token>" (direct token)
    token = authHeader;
  }

  console.log("Extracted token:", token);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};
