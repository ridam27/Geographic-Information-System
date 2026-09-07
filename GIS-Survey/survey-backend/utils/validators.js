// Simple, dependency-free validators used by authController.

// Standard, practical email-format check (not a full RFC 5322 parser —
// that's intentionally overkill — but it catches real-world typos).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

/**
 * Strong password rule:
 *  - min 8 characters
 *  - at least 1 uppercase letter
 *  - at least 1 lowercase letter
 *  - at least 1 number
 *  - at least 1 special character
 * Returns { valid: boolean, message: string }
 */
function validatePasswordStrength(password) {
  if (typeof password !== "string") {
    return { valid: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number." };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character." };
  }
  return { valid: true, message: "" };
}

module.exports = { isValidEmail, validatePasswordStrength };
