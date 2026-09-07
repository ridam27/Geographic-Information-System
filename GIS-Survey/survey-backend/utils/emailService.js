const nodemailer = require("nodemailer");

// Reused across requests instead of recreating a transporter every send.
// Works with Gmail (App Password), or any SMTP provider (SendGrid, Mailgun,
// SES SMTP, etc.) by setting EMAIL_HOST/EMAIL_PORT instead of EMAIL_SERVICE.
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_HOST) {
    // Generic SMTP provider
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true", // true for port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Simple named service, e.g. "gmail"
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
}

async function sendOtpEmail(toEmail, otp, fullName = "") {
  const appName = process.env.APP_NAME || "GIS Surveyor";
  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${otp} is your ${appName} verification code`,
    text: `Hi ${fullName || "there"},\n\nYour verification code is ${otp}. It expires in 5 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#2975cc;">${appName} — Email Verification</h2>
        <p>Hi ${fullName || "there"},</p>
        <p>Your one-time verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:#111;">${otp}</p>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p style="color:#666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
}

async function sendPasswordResetEmail(toEmail, resetLink, fullName = "") {
  const appName = process.env.APP_NAME || "GIS Surveyor";
  const mailOptions = {
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Reset your ${appName} password`,
    text: `Hi ${fullName || "there"},\n\nWe received a request to reset your password. Use the link below (valid for 1 hour):\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#2975cc;">${appName} — Password Reset</h2>
        <p>Hi ${fullName || "there"},</p>
        <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
        <p><a href="${resetLink}" style="background:#2975cc;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
        <p style="color:#666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
}

module.exports = { sendOtpEmail, sendPasswordResetEmail };
