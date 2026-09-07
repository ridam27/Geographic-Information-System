// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Access denied' });
  }
  req.user = req.session.user;
  next();
};

module.exports = authenticateToken;

