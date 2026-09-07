// backend/routes/ssoRoutes.js
//
// SSO callback for the Master Auth Server handoff. This is Authentication
// Source 1 (federated) — it sits ALONGSIDE the existing local login in
// userRoutes.js (Authentication Source 2), which is untouched. A user who
// arrives here has already been authenticated by the Main application;
// this route just verifies that claim and creates a normal local session,
// exactly like userRoutes.js's /login does.

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();

const MASTER_AUTH_URL = process.env.MASTER_AUTH_URL; // e.g. https://geohub-main.onrender.com
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || 'gis-viewer';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET;
const FRONTEND_HOME = process.env.SSO_SUCCESS_REDIRECT || '/';

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
    // Server-to-server exchange — the browser never sees the client secret
    // or the resulting assertion.
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

    // Verify the signed assertion matches what we just requested — defense
    // in depth on top of the already-authenticated HTTPS channel.
    const decoded = jwt.verify(assertion, SSO_CLIENT_SECRET, {
      issuer: 'gis-master-auth',
      audience: SSO_CLIENT_ID,
    });
    if (decoded.sub !== String(identity.id)) {
      throw new Error('Assertion subject mismatch.');
    }

    // Find-or-create a local User record for this federated identity, then
    // establish a normal local session — identical shape to userRoutes.js.
    let user = null;
    try {
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ email: identity.email });
        if (!user) {
          const bcrypt = require('bcryptjs');
          const randomPassword = require('crypto').randomBytes(24).toString('hex');
          user = new User({
            username: identity.name,
            email: identity.email,
            password: await bcrypt.hash(randomPassword, 10),
          });
          await user.save();
        }
      }
    } catch (dbErr) {
      console.warn('[sso/callback] Mongo user lookup error, falling back to memory session identity:', dbErr.message);
    }

    req.session.user = {
      _id: user ? user._id : `sso-${identity.id}`,
      username: user ? user.username : identity.name,
      email: user ? user.email : identity.email,
    };

    return res.redirect(FRONTEND_HOME);
  } catch (err) {
    console.error('[sso/callback] error:', err.message);
    return res.status(502).send('Could not verify sign-in with the main portal. Please try again.');
  }
});

module.exports = router;
