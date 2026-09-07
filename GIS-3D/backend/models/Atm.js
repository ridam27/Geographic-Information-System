const mongoose = require("mongoose");

const ATM_TYPES = ["onsite", "offsite", "mobile"];

function normalizeAtmType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\/-]+/g, "_");

  if (ATM_TYPES.includes(normalized)) {
    return normalized;
  }

  return "offsite";
}

const atmSchema = new mongoose.Schema({
  atmId: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  bankName: {
    type: String,
    trim: true,
    required: true,
  },
  type: {
    type: String,
    trim: true,
    enum: ATM_TYPES,
    default: "offsite",
    set: normalizeAtmType,
  },
  status: {
    type: String,
    trim: true,
    default: "active",
  },
  installationDate: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  position: {
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    height: {
      type: Number,
      default: 0,
    },
  },
  // Legacy cartesian coordinates kept for backward compatibility (same as Pole/Manhole).
  x: {
    type: Number,
  },
  y: {
    type: Number,
  },
  z: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Atm", atmSchema);