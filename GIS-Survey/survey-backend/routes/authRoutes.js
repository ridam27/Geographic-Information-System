const express = require("express");
const {
  initiateSignup,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

/* ===================== SIGNUP (STEP 1: send OTP) ===================== */
router.post("/signup", initiateSignup);

/* ===================== VERIFY OTP (STEP 2: create user) ===================== */
router.post("/verify-otp", verifyOtp);

/* ===================== RESEND OTP ===================== */
router.post("/resend-otp", resendOtp);

/* ===================== LOGIN ===================== */
router.post("/login", login);

/* ===================== FORGOT PASSWORD ===================== */
router.post("/forgot-password", forgotPassword);

/* ===================== RESET PASSWORD ===================== */
router.post("/reset-password/:token", resetPassword);

module.exports = router;
