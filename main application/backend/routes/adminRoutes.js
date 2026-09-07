const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppPermission = require('../models/AppPermission');
const requireMasterSession = require('../middleware/requireMasterSession');
const { MODULES, MODULE_IDS, isValidModuleId } = require('../config/modules');
const { getPasswordError } = require('../utils/passwordPolicy');

const router = express.Router();

const BCRYPT_ROUNDS = 12;

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, status: user.status };
}

async function requireAdmin(req, res, next) {
  const user = await User.findById(req.session.user.id);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Admin privileges required.' });
  }
  req.adminUser = user;
  next();
}

router.use(requireMasterSession, requireAdmin);

// ---------------------------------------------------------------------------
// GET /api/admin/modules — the fixed registry of modules/roles an admin can
// assign to a sub-user, for populating the module selector in the UI.
// ---------------------------------------------------------------------------
router.get('/modules', (req, res) => {
  res.status(200).json({ modules: MODULES.map(({ id, name }) => ({ id, name })) });
});

// ---------------------------------------------------------------------------
// GET /api/admin/users — every user with their assigned module(s) and status.
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  const users = await User.find().select('name email status isAdmin createdAt').sort({ createdAt: 1 }).lean();
  const perms = await AppPermission.find({ permission: 'allowed' }).lean();
  const byUser = {};
  perms.forEach((p) => {
    const key = String(p.userId);
    byUser[key] = byUser[key] || [];
    byUser[key].push(p.moduleId);
  });
  const result = users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    status: u.status,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
    modules: byUser[String(u._id)] || [],
  }));
  res.status(200).json({ modules: MODULE_IDS, users: result });
});

// ---------------------------------------------------------------------------
// POST /api/admin/users — create a sub-user with one or more assigned modules.
// ---------------------------------------------------------------------------
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, moduleIds, moduleId } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const selectedModules = Array.isArray(moduleIds) ? [...new Set(moduleIds)] : moduleId ? [moduleId] : [];
    if (selectedModules.length === 0 || !selectedModules.every(isValidModuleId)) {
      return res.status(400).json({ message: 'Select at least one valid module.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      isAdmin: false,
    });

    await AppPermission.insertMany(selectedModules.map((selectedModuleId) => ({
      userId: user._id,
      moduleId: selectedModuleId,
      permission: 'allowed',
      grantedBy: req.adminUser._id,
    })));

    return res.status(201).json({ user: publicUser(user), modules: selectedModules });
  } catch (err) {
    console.error('[admin/users:create] error:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return res.status(500).json({ message: 'Could not create the user. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/role — replace a sub-user's assigned module(s).
// Body: { moduleId } for a single role, or { moduleIds: [...] } for more
// than one. Any module not in the new set is revoked, so switching a
// user's role always fully closes off their previous access.
// ---------------------------------------------------------------------------
router.patch('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { moduleId, moduleIds } = req.body || {};
  const nextModules = Array.isArray(moduleIds) ? [...new Set(moduleIds)] : moduleId ? [moduleId] : null;

  if (!nextModules || nextModules.length === 0 || !nextModules.every(isValidModuleId)) {
    return res.status(400).json({ message: 'At least one valid role (module) is required.' });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (targetUser.isAdmin) {
    return res.status(400).json({ message: "Admin accounts always have access to every module." });
  }

  await AppPermission.deleteMany({ userId: targetUser._id });
  await AppPermission.bulkWrite(
    nextModules.map((mid) => ({
      updateOne: {
        filter: { userId: targetUser._id, moduleId: mid },
        update: { $set: { permission: 'allowed', grantedBy: req.adminUser._id } },
        upsert: true,
      },
    }))
  );

  return res.status(200).json({ user: publicUser(targetUser), modules: nextModules });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:id/status — enable/disable a sub-user's account.
// ---------------------------------------------------------------------------
router.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ message: "status must be 'active' or 'disabled'." });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (targetUser.isAdmin) {
    return res.status(400).json({ message: 'Admin accounts cannot be disabled from here.' });
  }
  if (String(targetUser._id) === String(req.adminUser._id)) {
    return res.status(400).json({ message: 'You cannot change your own account status.' });
  }

  targetUser.status = status;
  await targetUser.save();
  return res.status(200).json({ user: publicUser(targetUser) });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/users/:id — remove a sub-user and their permissions.
// ---------------------------------------------------------------------------
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const targetUser = await User.findById(id);
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found.' });
  }
  if (targetUser.isAdmin) {
    return res.status(400).json({ message: 'Admin accounts cannot be deleted from here.' });
  }

  await AppPermission.deleteMany({ userId: targetUser._id });
  await User.deleteOne({ _id: targetUser._id });
  return res.status(200).json({ message: 'User deleted.' });
});

module.exports = router;
