const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const AppPermission = require('../models/AppPermission');
const AuthorizationCode = require('../models/AuthorizationCode');
const requireMasterSession = require('../middleware/requireMasterSession');
const { loginLimiter, authorizeLimiter } = require('../middleware/rateLimiters');
const { APPS, getAppSecret } = require('../config/apps');
const { MODULE_IDS, moduleIdForSsoApp } = require('../config/modules');
const { getPasswordError } = require('../utils/passwordPolicy');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 8;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin };
}

async function grantAllModules(userId, grantedBy = userId) {
  const operations = MODULE_IDS.map((moduleId) => ({
    updateOne: {
      filter: { userId, moduleId },
      update: { $set: { permission: 'allowed', grantedBy } },
      upsert: true,
    },
  }));

  if (operations.length) {
    await AppPermission.bulkWrite(operations);
  }
}

async function getAllowedModules(userId) {
  const rows = await AppPermission.find({ userId, permission: 'allowed' });
  return rows.map((p) => p.moduleId);
}

// Persist the session before responding, so a fetch that immediately
// follows (the frontend re-checks /api/auth/session right after
// login/register) can never race a not-yet-flushed session write and
// see "not authenticated" straight after a successful login.
function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

// ---------------------------------------------------------------------------
// GET /api/auth/bootstrap-status — lets the login screen know whether a
// master admin already exists, so it can hide public self-registration
// once the platform has an admin who should be creating sub-users instead.
// ---------------------------------------------------------------------------
router.get('/bootstrap-status', async (req, res) => {
  try {
    const adminExists = (await User.countDocuments({ isAdmin: true })) > 0;
    return res.status(200).json({ adminExists });
  } catch (err) {
    console.error('[auth/bootstrap-status] error:', err.message);
    return res.status(500).json({ message: 'Could not check bootstrap status.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Only creates the very first (bootstrap) admin account. Once an admin
// exists, sub-users must be created by that admin from the Admin Panel —
// this keeps every account's module access an explicit, admin-granted
// decision instead of open self-signup.
// ---------------------------------------------------------------------------
router.post('/register', loginLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const adminExists = (await User.countDocuments({ isAdmin: true })) > 0;
    if (adminExists) {
      return res.status(403).json({
        message: 'Self-registration is disabled. Ask your administrator to create an account for you.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      isAdmin: true, // first account ever created becomes the bootstrap admin
    });

    await grantAllModules(user._id);

    req.session.user = publicUser(user);
    await saveSession(req);

    return res.status(201).json({
      user: publicUser(user),
      allowedModules: MODULE_IDS,
      bootstrappedAdmin: true,
    });
  } catch (err) {
    console.error('[auth/register] error:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Constant-shape response whether or not the user exists, to avoid
    // leaking account existence.
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(423).json({ message: `Account temporarily locked. Try again in ${minutes} minute(s).` });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'This account has been disabled. Contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    req.session.user = publicUser(user);
    await saveSession(req);

    const allowedModules = await getAllowedModules(user._id);
    return res.status(200).json({ user: publicUser(user), allowedModules });
  } catch (err) {
    console.error('[auth/login] error:', err.message);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  if (!req.session) return res.status(200).json({ message: 'Logged out.' });
  req.session.destroy((err) => {
    if (err) {
      console.error('[auth/logout] error:', err.message);
      return res.status(500).json({ message: 'Logout failed.' });
    }
    res.clearCookie('master.sid');
    return res.status(200).json({ message: 'Logged out.' });
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/session — "am I logged in" check for the dashboard UI
// ---------------------------------------------------------------------------
router.get('/session', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(200).json({ authenticated: false });
  }
  // Re-verify against the DB so a disabled/deleted user is caught immediately,
  // not just trusted from the session blob.
  const user = await User.findById(req.session.user.id);
  if (!user || user.status === 'disabled') {
    req.session.destroy(() => {});
    return res.status(200).json({ authenticated: false });
  }
  const allowedModules = await getAllowedModules(user._id);
  return res.status(200).json({
    authenticated: true,
    user: publicUser(user),
    allowedModules,
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/authorize  { appId }
// Mints a one-time authorization code for the given app, if the current
// master session is valid and the user is permitted to access the module
// that app belongs to. `appId` here is the SSO client id (e.g.
// "gis-viewer"), unchanged from before, so existing GIS app integrations
// keep working — the permission check underneath is now module-based.
// ---------------------------------------------------------------------------
router.post('/authorize', authorizeLimiter, requireMasterSession, async (req, res) => {
  try {
    const { appId } = req.body || {};
    if (!appId || !APPS[appId]) {
      return res.status(400).json({ message: 'Unknown application.' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user || user.status === 'disabled') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    const moduleId = moduleIdForSsoApp(appId);
    const permission = moduleId
      ? await AppPermission.findOne({ userId: user._id, moduleId })
      : null;
    if (!permission || permission.permission !== 'allowed') {
      return res.status(403).json({ message: `You do not have access to ${APPS[appId].name}.` });
    }

    // Generate an opaque, high-entropy, single-use code. Only its hash is
    // stored, so a database read alone can't be replayed as a valid code.
    const rawCode = crypto.randomBytes(32).toString('base64url');
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    await AuthorizationCode.create({ codeHash, userId: user._id, appId });

    return res.status(200).json({
      code: rawCode,
      callbackUrl: APPS[appId].callbackUrl,
      expiresInSeconds: 60,
    });
  } catch (err) {
    console.error('[auth/authorize] error:', err.message);
    return res.status(500).json({ message: 'Could not authorize application access.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/token  { code, client_id, client_secret }
// Server-to-server code exchange. Called by a GIS app's OWN backend, never
// by the browser. Returns a short-lived signed identity assertion (JWT).
// ---------------------------------------------------------------------------
router.post('/token', async (req, res) => {
  try {
    const { code, client_id: clientId, client_secret: clientSecret } = req.body || {};
    if (!code || !clientId || !clientSecret) {
      return res.status(400).json({ message: 'code, client_id and client_secret are required.' });
    }

    const app = APPS[clientId];
    const expectedSecret = getAppSecret(clientId);
    if (!app || !expectedSecret) {
      return res.status(401).json({ message: 'Unknown client application.' });
    }
    // Constant-time compare of the shared secret.
    const secretsMatch =
      Buffer.byteLength(clientSecret) === Buffer.byteLength(expectedSecret) &&
      crypto.timingSafeEqual(Buffer.from(clientSecret), Buffer.from(expectedSecret));
    if (!secretsMatch) {
      return res.status(401).json({ message: 'Invalid client credentials.' });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const authCode = await AuthorizationCode.findOne({ codeHash });

    if (!authCode || authCode.used || authCode.appId !== clientId) {
      return res.status(400).json({ message: 'Invalid, expired, or already-used authorization code.' });
    }

    // Single-use: mark consumed immediately, before any further work, to
    // close the race window on concurrent redemption attempts.
    authCode.used = true;
    await authCode.save();

    const user = await User.findById(authCode.userId);
    if (!user || user.status === 'disabled') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    // Sign a short-lived assertion with the app's own shared secret (HS256).
    // Only Master and this specific app know this secret, so possession of
    // a valid signature is itself proof the assertion came from Master.
    const assertion = jwt.sign(
      {
        sub: String(user._id),
        name: user.name,
        email: user.email,
        appId: clientId,
      },
      expectedSecret,
      { expiresIn: '60s', issuer: 'gis-master-auth', audience: clientId }
    );

    return res.status(200).json({
      identity: { id: user._id, name: user.name, email: user.email },
      assertion,
    });
  } catch (err) {
    console.error('[auth/token] error:', err.message);
    return res.status(500).json({ message: 'Token exchange failed.' });
  }
});

module.exports = router;
