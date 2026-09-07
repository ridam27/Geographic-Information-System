const crypto = require("crypto");

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

// Generates a cryptographically random 6-digit numeric OTP, e.g. "042917".
// crypto.randomInt is preferred over Math.random for anything security-related.
function generateOtp() {
  const otp = crypto.randomInt(0, 1000000); // 0 - 999999
  return otp.toString().padStart(OTP_LENGTH, "0");
}

// We never store the raw OTP — only its SHA-256 hash — so a DB leak alone
// doesn't expose active codes.
function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function otpExpiryDate() {
  return new Date(Date.now() + OTP_EXPIRY_MS);
}

module.exports = {
  generateOtp,
  hashOtp,
  otpExpiryDate,
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
};
