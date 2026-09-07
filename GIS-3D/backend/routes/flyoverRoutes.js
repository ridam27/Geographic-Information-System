const express = require("express");
const Flyover = require("../models/Flyover");

const router = express.Router();

const ALLOWED_MATERIALS = ["RCC", "PSC", "Steel"];
const ALLOWED_STATUSES = ["Planned", "Under Construction", "Active", "Maintenance"];

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validatePoints(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return "points must be an array with at least 2 points";
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const latitude = point?.latitude;
    const longitude = point?.longitude;
    const height = point?.height ?? 0;

    if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
      return `points[${index}].latitude must be a valid latitude`;
    }

    if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
      return `points[${index}].longitude must be a valid longitude`;
    }

    if (!isFiniteNumber(height)) {
      return `points[${index}].height must be a valid number`;
    }
  }

  return "";
}

router.post("/add", async (req, res) => {
  try {
    const { flyoverId, width, deckHeight, lanes, material, status, installationDate, points } = req.body;

    if (!flyoverId || !String(flyoverId).trim()) {
      return res.status(400).json({
        success: false,
        message: "flyoverId is required",
      });
    }

    if (!isFiniteNumber(width) || width <= 0) {
      return res.status(400).json({
        success: false,
        message: "width must be a valid number greater than 0",
      });
    }

    if (!isFiniteNumber(deckHeight) || deckHeight <= 0) {
      return res.status(400).json({
        success: false,
        message: "deckHeight must be a valid number greater than 0",
      });
    }

    const parsedLanes = Number.isFinite(Number(lanes)) && Number(lanes) > 0 ? Number(lanes) : 2;

    if (!ALLOWED_MATERIALS.includes(material)) {
      return res.status(400).json({
        success: false,
        message: `material must be one of: ${ALLOWED_MATERIALS.join(", ")}`,
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const parsedDate = new Date(installationDate);
    if (!installationDate || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "installationDate must be a valid date",
      });
    }

    const pointValidationError = validatePoints(points);
    if (pointValidationError) {
      return res.status(400).json({
        success: false,
        message: pointValidationError,
      });
    }

    const payload = {
      flyoverId: String(flyoverId).trim(),
      width,
      deckHeight,
      lanes: parsedLanes,
      material,
      status,
      installationDate: parsedDate,
      points: points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        height: point.height ?? 0,
      })),
    };

    const flyover = await Flyover.create(payload);

    return res.status(201).json({
      success: true,
      message: "Flyover saved successfully",
      flyover,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "flyoverId already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save flyover",
      error: error.message,
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    const flyovers = await Flyover.find().sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      flyovers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch flyovers",
      error: error.message,
    });
  }
});

module.exports = router;
