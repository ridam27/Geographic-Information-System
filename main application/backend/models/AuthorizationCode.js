const mongoose = require('mongoose');

/**
 * Short-lived, single-use authorization codes used to hand off identity
 * from the Master Auth Server to a target GIS app without ever putting a
 * token or user id in a trusted way inside a URL. The code itself is
 * opaque and worthless without the target app's client_secret, which is
 * required to redeem it via the server-to-server /api/auth/token call.
 */
const authorizationCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appId: { type: String, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 90 }, // TTL index: Mongo purges ~90s after creation
});

module.exports = mongoose.model('AuthorizationCode', authorizationCodeSchema);
