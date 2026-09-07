/**
 * Guards routes that require an active Master session (the browser's
 * own same-origin session cookie against the Main application backend).
 */
module.exports = function requireMasterSession(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }
  next();
};
