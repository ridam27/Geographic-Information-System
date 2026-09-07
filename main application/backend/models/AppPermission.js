const mongoose = require('mongoose');
const { MODULE_IDS } = require('../config/modules');

/**
 * Per-user, per-module authorization. Default-deny: a row must exist with
 * permission "allowed" for a user to see/open that module at all. This is
 * what lets a Master account mean "logged in" without automatically
 * meaning "can open every module forever" — each sub-user only gets the
 * module(s) an admin explicitly assigned as their role.
 */
const appPermissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    moduleId: {
      type: String,
      required: true,
      enum: MODULE_IDS,
    },
    permission: { type: String, enum: ['allowed', 'denied'], default: 'allowed' },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

appPermissionSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('AppPermission', appPermissionSchema);
