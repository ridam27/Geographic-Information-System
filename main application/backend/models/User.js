const mongoose = require('mongoose');

/**
 * Central identity for the Master Authentication Server.
 * This collection is independent from each GIS app's own local `User`
 * model (Survey, Viewer, etc.) — those remain the source of truth for
 * direct/local logins into their respective apps.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    isAdmin: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
