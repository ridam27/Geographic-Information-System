const rateLimit = require('express-rate-limit');

// Brute-force protection on login/register — generous enough for real users,
// tight enough to slow down credential stuffing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});

const authorizeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authorization requests. Please slow down.' },
});

module.exports = { loginLimiter, authorizeLimiter };
