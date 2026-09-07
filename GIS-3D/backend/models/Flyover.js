const mongoose = require("mongoose");

const ALLOWED_MATERIALS = ["RCC", "PSC", "Steel"];
const ALLOWED_STATUSES = ["Planned", "Under Construction", "Active", "Maintenance"];

const flyoverPointSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    height: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const flyoverSchema = new mongoose.Schema(
  {
    flyoverId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
    },
    deckHeight: {
      type: Number,
      required: true,
      min: 1,
    },
    lanes: {
      type: Number,
      default: 2,
      min: 1,
    },
    material: {
      type: String,
      required: true,
      enum: ALLOWED_MATERIALS,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ALLOWED_STATUSES,
      trim: true,
    },
    installationDate: {
      type: Date,
      required: true,
    },
    points: {
      type: [flyoverPointSchema],
      validate: {
        validator(points) {
          return Array.isArray(points) && points.length >= 2;
        },
        message: "A flyover must contain at least 2 points",
      },
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Flyover", flyoverSchema);
