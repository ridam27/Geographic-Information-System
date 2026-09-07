// routes/ssoRoutes.js
//
// SSO callback for the Master Auth Server handoff (Main application). This
// sits ALONGSIDE the existing local email/password login in authRoutes.js —
// a user who arrives here has already been authenticated by the Main
// application; this route just verifies that claim and mints the same kind
// of JWT that /api/auth/login issues, then hands it to the SPA.
//
// Unlike GIS-Viewer (which uses server-side cookie sessions), this app's
// frontend keeps its auth token in localStorage and sends it as a Bearer
// header (see middleware/authMiddleware.js) — so instead of setting a
// cookie, we redirect the browser to the SPA with the token in the URL,
// and a one-time route on the frontend (/sso-complete) picks it up and
// stores it, exactly like a normal login response would.

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../model/user');

const router = express.Router();

const MASTER_AUTH_URL = process.env.MASTER_AUTH_URL; // e.g. http://localhost:4100
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || 'gis-survey';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET;
const FRONTEND_SSO_COMPLETE = process.env.SSO_SUCCESS_REDIRECT || 'http://localhost:3002/sso-complete';
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-jwt-secret';

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!MASTER_AUTH_URL || !SSO_CLIENT_SECRET) {
    console.error('[sso/callback] MASTER_AUTH_URL / SSO_CLIENT_SECRET not configured.');
    return res.status(503).send('Single sign-on is not configured on this application.');
  }
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const tokenRes = await fetch(`${MASTER_AUTH_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: SSO_CLIENT_ID,
        client_secret: SSO_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}));
      console.warn('[sso/callback] token exchange rejected:', body.message);
      return res.status(401).send('Sign-in link expired or already used. Please return to the main portal and try again.');
    }

    const { identity, assertion } = await tokenRes.json();

    const decoded = jwt.verify(assertion, SSO_CLIENT_SECRET, {
      issuer: 'gis-master-auth',
      audience: SSO_CLIENT_ID,
    });
    if (decoded.sub !== String(identity.id)) {
      throw new Error('Assertion subject mismatch.');
    }

    // Find-or-create a local User record for this federated identity.
    let user = null;
    try {
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ email: identity.email });
        if (!user) {
          const bcrypt = require('bcryptjs');
          const randomPassword = require('crypto').randomBytes(24).toString('hex');
          user = new User({
            fullName: identity.name,
            email: identity.email,
            password: await bcrypt.hash(randomPassword, 10),
          });
          await user.save();
        }
      } else {
        console.warn('[sso/callback] MongoDB not connected (readyState !== 1), issuing SSO token directly.');
      }
    } catch (dbErr) {
      console.warn('[sso/callback] Mongo user lookup error, proceeding with SSO identity:', dbErr.message);
    }

    const userId = user ? user._id : `sso-${identity.id}`;
    const fullName = user ? (user.fullName || identity.name) : identity.name;
    const email = user ? user.email : identity.email;

    // Same shape as authController.login's token.
    const token = jwt.sign({ userId, email, fullName }, JWT_SECRET, { expiresIn: '1d' });
    const payload = { fullName, email };

    const url = `${FRONTEND_SSO_COMPLETE}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(payload))}`;
    return res.redirect(url);
  } catch (err) {
    console.error('[sso/callback] error:', err.message);
    return res.status(502).send('Could not verify sign-in with the main portal. Please try again.');
  }
});

module.exports = router;
