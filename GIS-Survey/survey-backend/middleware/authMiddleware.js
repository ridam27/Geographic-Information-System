const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "local-dev-jwt-secret";

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // 1️⃣ Check token exists
  if (!authHeader) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  // 2️⃣ Extract token (Bearer <token>)
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Malformed token",
    });
  }

  // 3️⃣ Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4️⃣ Attach user info to request
    req.user = decoded; // { userId }

    // 5️⃣ Allow request to continue
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
