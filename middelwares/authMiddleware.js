// const jwt = require("jsonwebtoken");
// const SECRET = process.env.JWT_SECRET || "supersecret";

// module.exports = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   let token;

//   // Handle both "Bearer token" and direct token formats
//   if (authHeader.includes(" ")) {
//     // Format: "Bearer <token>"
//     token = authHeader.split(" ")[1];
//   } else {
//     // Format: "<token>" (direct token)
//     token = authHeader;
//   }

//   if (!token) {
//     return res.status(401).json({ message: "No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, SECRET);
//     req.userId = decoded.id;
//     next();
//   } catch (err) {
//     console.error("Token verification error:", err.message);
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SECRET = process.env.JWT_SECRET || "supersecret";

module.exports = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    const { userId, email } = decoded;

    // Check if user exists in database with matching userId and email
    const user = await User.findOne({
      $and: [{ userId: userId }, { email: email }],
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "User Not Found Unauthorize access" });
    }

    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};
