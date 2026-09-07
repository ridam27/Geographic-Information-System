# Secure Email OTP Registration — Patch

This drops into your existing `survey-backend` / `survey-frontend` folders.
Nothing else in your project is touched — signup/login flow only.

## 1. Backend — where each file goes

```
survey-backend/
├── model/
│   └── OtpVerification.js        <-- NEW
├── controllers/
│   └── authController.js         <-- NEW
├── routes/
│   └── authRoutes.js              <-- REPLACES existing file
├── utils/
│   ├── validators.js               <-- NEW
│   ├── otpUtils.js                 <-- NEW
│   └── emailService.js             <-- NEW
```

`model/user.js`, `server.js`, `middleware/authMiddleware.js` are untouched —
your `/api/auth` mount in `server.js` already points at `authRoutes.js`, so
no wiring changes needed there.

### Install nodemailer
```bash
cd survey-backend
npm install nodemailer
```

### Add to `survey-backend/.env`
```env
# --- Email (OTP + password reset) ---
EMAIL_SERVICE=gmail          # or omit and use EMAIL_HOST/PORT for other SMTP providers
EMAIL_USER=your-app-email@gmail.com
EMAIL_PASS=your-16-char-gmail-app-password   # NOT your normal Gmail password
APP_NAME=GIS Surveyor

# If NOT using Gmail, use a generic SMTP host instead of EMAIL_SERVICE:
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_SECURE=false
```
Gmail note: you must create an **App Password** (Google Account → Security →
2-Step Verification → App Passwords). Your regular Gmail password will not
work with SMTP.

## 2. Frontend — where each file goes

```
survey-frontend/src/
├── App.js                                                <-- REPLACES existing file (adds /verify-otp route)
├── Components/Authentication/
│   ├── JavaScript/
│   │   ├── SignUp.js                                     <-- REPLACES existing file
│   │   └── VerifyOtp.js                                  <-- NEW
│   └── Styles/
│       ├── VerifyOtp.css                                 <-- NEW
│       └── SignUp.css.APPEND.css                         <-- append its contents to your existing SignUp.css, then delete this file
```

No changes needed to `UserLogin.js`, `AuthContext.js`, or `ProtectedRoute.js`.

## 3. New API endpoints (mounted at `/api/auth`, same as before)

| Method | Endpoint                     | Body                          | Purpose                                   |
|--------|-------------------------------|--------------------------------|--------------------------------------------|
| POST   | `/api/auth/signup`            | `{ fullName, email, password }`| Validates input, sends OTP (no user yet)   |
| POST   | `/api/auth/verify-otp`        | `{ email, otp }`               | Verifies OTP, creates the User, returns JWT|
| POST   | `/api/auth/resend-otp`        | `{ email }`                    | Resends OTP (60s cooldown)                 |
| POST   | `/api/auth/login`             | unchanged                      | unchanged                                  |
| POST   | `/api/auth/forgot-password`   | unchanged                      | now actually emails the reset link         |
| POST   | `/api/auth/reset-password/:token` | unchanged                  | now also enforces the strong-password rule |

## 4. How it works end-to-end

1. `POST /signup` → validates email format + password strength (8+ chars,
   upper, lower, number, special char) → rejects if email already has a
   **real** account → generates a 6-digit OTP → bcrypt-hashes the password
   → SHA-256-hashes the OTP → upserts a `OtpVerification` document (fullName,
   passwordHash, otpHash, 5-min `expiresAt`) → emails the plain OTP via
   Nodemailer. **No `User` document is created at this point.**
2. Frontend routes to `/verify-otp` with the email carried in router state
   (and mirrored into `sessionStorage` so a refresh doesn't lose it).
3. `POST /verify-otp` → looks up the pending doc → checks expiry → checks
   attempts (max 5, then the pending signup is discarded and they must sign
   up again) → compares the OTP hash → on success, creates the real `User`
   with the already-hashed password, deletes the OTP doc, returns a JWT.
4. `POST /resend-otp` → enforces a 60-second cooldown per email (tracked via
   `lastSentAt`), issues a fresh OTP + resets the attempt counter.
5. MongoDB TTL index on `OtpVerification.expiresAt` auto-deletes abandoned/
   expired pending signups — no cron job needed.

## 5. Security notes

- Passwords are bcrypt-hashed (10 rounds) **before** they ever touch the
  `OtpVerification` collection — plaintext is never persisted.
- OTPs are stored as SHA-256 hashes, never in plaintext.
- OTP verification is rate-limited (5 attempts) and the record self-destructs
  on exhaustion or expiry.
- Resend is cooldown-limited (60s) to prevent email-bombing.
- `/forgot-password` still doesn't reveal whether an email is registered.
