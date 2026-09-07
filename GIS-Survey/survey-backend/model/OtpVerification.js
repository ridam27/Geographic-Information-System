const mongoose = require("mongoose");

/**
 * Holds a PENDING registration until the OTP is verified.
 * The real User document is only created after successful verification
 * (see controllers/authController.js -> verifyOtp).
 *
 * - otpHash: we never store the raw OTP, only its SHA-256 hash.
 * - passwordHash: the user's password, already bcrypt-hashed at signup time,
 *   so plaintext passwords never sit in the DB even temporarily.
 * - expiresAt + the TTL index below: MongoDB automatically deletes the
 *   document once it expires, so stale/abandoned signups don't pile up.
 */
const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB will delete the document automatically once
// expiresAt is in the past. expireAfterSeconds: 0 means "delete exactly
// at the time stored in expiresAt".
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OtpVerification", otpVerificationSchema);
