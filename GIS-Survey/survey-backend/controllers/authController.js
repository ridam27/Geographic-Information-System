const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../model/user");
const OtpVerification = require("../model/OtpVerification");
const { isValidEmail, validatePasswordStrength } = require("../utils/validators");
const {
  generateOtp,
  hashOtp,
  otpExpiryDate,
  RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
} = require("../utils/otpUtils");
const { sendOtpEmail } = require("../utils/emailService");

const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "local-dev-jwt-secret";

/* =========================================================
   STEP 1: SIGNUP  ->  validate + send OTP (no User created yet)
   POST /api/auth/signup   { fullName, email, password }
========================================================= */
async function initiateSignup(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "Full name is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Already a real, verified account? Don't let them re-register.
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered." });
    }

    // Respect resend cooldown even on a fresh /signup call — this stops
    // someone from spamming the signup endpoint to blast repeated emails.
    const existingPending = await OtpVerification.findOne({ email: normalizedEmail });
    if (existingPending) {
      const elapsed = Date.now() - new Date(existingPending.lastSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSeconds}s before requesting another OTP.`,
        });
      }
    }

    const otp = generateOtp();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Upsert: overwrite any previous pending signup attempt for this email.
    await OtpVerification.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        fullName: fullName.trim(),
        passwordHash,
        otpHash: hashOtp(otp),
        attempts: 0,
        lastSentAt: new Date(),
        expiresAt: otpExpiryDate(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(normalizedEmail, otp, fullName.trim());

    return res.status(200).json({
      message: "OTP sent to your email. It expires in 5 minutes.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("initiateSignup error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}

/* =========================================================
   STEP 2: VERIFY OTP -> create the real User, delete OTP doc
   POST /api/auth/verify-otp   { email, otp }
========================================================= */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = await OtpVerification.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(400).json({
        message: "No pending verification found for this email. Please sign up again.",
      });
    }

    if (pending.expiresAt.getTime() < Date.now()) {
      await OtpVerification.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
      await OtpVerification.deleteOne({ _id: pending._id });
      return res.status(429).json({
        message: "Too many incorrect attempts. Please sign up again to get a new OTP.",
      });
    }

    const isMatch = pending.otpHash === hashOtp(String(otp).trim());

    if (!isMatch) {
      pending.attempts += 1;
      await pending.save();
      const remaining = MAX_VERIFY_ATTEMPTS - pending.attempts;
      return res.status(400).json({
        message:
          remaining > 0
            ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
            : "Incorrect OTP. No attempts remaining — please sign up again.",
      });
    }

    // Guard against a race where the email got registered by another
    // request between signup and verification.
    const alreadyExists = await User.findOne({ email: normalizedEmail });
    if (alreadyExists) {
      await OtpVerification.deleteOne({ _id: pending._id });
      return res.status(400).json({ message: "This email is already registered." });
    }

    const newUser = await User.create({
      fullName: pending.fullName,
      email: pending.email,
      password: pending.passwordHash, // already bcrypt-hashed at signup time
    });

    await OtpVerification.deleteOne({ _id: pending._id });

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(201).json({
      message: "Email verified. Account created successfully.",
      token,
      user: {
        fullName: newUser.fullName,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}

/* =========================================================
   RESEND OTP (60s cooldown)
   POST /api/auth/resend-otp   { email }
========================================================= */
async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = await OtpVerification.findOne({ email: normalizedEmail });

    if (!pending) {
      return res.status(400).json({
        message: "No pending signup found for this email. Please sign up again.",
      });
    }

    const elapsed = Date.now() - new Date(pending.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSeconds}s before requesting another OTP.`,
      });
    }

    const otp = generateOtp();
    pending.otpHash = hashOtp(otp);
    pending.attempts = 0;
    pending.lastSentAt = new Date();
    pending.expiresAt = otpExpiryDate();
    await pending.save();

    await sendOtpEmail(normalizedEmail, otp, pending.fullName);

    return res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("resendOtp error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}

/* =========================================================
   LOGIN (unchanged behaviour)
========================================================= */
async function login(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: (email || "").trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "User not registered" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({
      token,
      user: { fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

/* =========================================================
   FORGOT PASSWORD / RESET PASSWORD (unchanged from your original)
========================================================= */
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(200).json({
        message: "If this email is registered, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const frontendOrigin =
      process.env.FRONTEND_URL || req.get("origin") || "http://localhost:3000";
    const resetLink = `${frontendOrigin.replace(/\/$/, "")}/reset-password/${rawToken}`;

    // Now that emailService.js exists, send the real reset email instead of
    // returning the link in the JSON response.
    try {
      const { sendPasswordResetEmail } = require("../utils/emailService");
      if (typeof sendPasswordResetEmail === "function") {
        await sendPasswordResetEmail(user.email, resetLink, user.fullName);
      }
    } catch (mailErr) {
      console.error("Password reset email failed to send:", mailErr);
    }

    res.status(200).json({
      message: "If this email is registered, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "New password is required" });
  }

  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ message: passwordCheck.message });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  initiateSignup,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
};
