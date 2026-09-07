const express = require("express");
const Atm = require("../models/Atm");

const router = express.Router();

const ATM_TYPE_LABELS = {
  onsite: "Onsite ATM (inside a bank branch)",
  offsite: "Offsite ATM (standalone kiosk)",
  mobile: "Mobile ATM",
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeAtmType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\/-]+/g, "_");

  if (Object.prototype.hasOwnProperty.call(ATM_TYPE_LABELS, normalized)) {
    return normalized;
  }

  return "";
}

router.post("/add-atm", async (req, res) => {
  try {
    const {
      atmId,
      bankName,
      type,
      status,
      installationDate,
      notes,
      position,
      x,
      y,
      z,
    } = req.body;

    if (!atmId || typeof atmId !== "string" || !atmId.trim()) {
      return res.status(400).json({
        success: false,
        message: "ATM ID is required",
      });
    }

    if (!bankName || typeof bankName !== "string" || !bankName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required",
      });
    }

    const normalizedType = normalizeAtmType(type);

    if (!normalizedType) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${Object.keys(ATM_TYPE_LABELS).join(", ")}`,
      });
    }

    const hasGeodeticPosition =
      position &&
      isFiniteNumber(position.longitude) &&
      isFiniteNumber(position.latitude) &&
      isFiniteNumber(position.height ?? 0);

    const hasLegacyCartesian = [x, y, z].every(isFiniteNumber);

    if (!hasGeodeticPosition && !hasLegacyCartesian) {
      return res.status(400).json({
        success: false,
        message:
          "Provide either position.longitude/latitude/height or legacy x, y, z coordinates",
      });
    }

    if (installationDate) {
      const parsedDate = new Date(installationDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "installationDate must be a valid date",
        });
      }
    }

    const payload = {
      atmId,
      bankName,
      type: normalizedType,
      status,
      notes,
      installationDate: installationDate ? new Date(installationDate) : undefined,
      position: hasGeodeticPosition
        ? {
            longitude: position.longitude,
            latitude: position.latitude,
            height: position.height ?? 0,
          }
        : undefined,
      x: hasLegacyCartesian ? x : undefined,
      y: hasLegacyCartesian ? y : undefined,
      z: hasLegacyCartesian ? z : undefined,
    };

    const atm = await Atm.create(payload);

    return res.status(201).json({
      success: true,
      message: "ATM saved successfully",
      atm,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || "atmId";
      const duplicateValue = error.keyValue?.[duplicateField] ?? "unknown";

      return res.status(409).json({
        success: false,
        message: `ATM with ID "${duplicateValue}" already exists. Please use a different ID.`,
        error: "DUPLICATE_ID",
        field: duplicateField,
        value: duplicateValue,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save ATM",
      error: error.message,
    });
  }
});

router.get("/get-atms", async (_req, res) => {
  try {
    const atms = await Atm.find().sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      atms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ATMs",
      error: error.message,
    });
  }
});

router.get("/get-atm/:id", async (req, res) => {
  try {
    const atm = await Atm.findById(req.params.id);

    if (!atm) {
      return res.status(404).json({
        success: false,
        message: "ATM not found",
      });
    }

    return res.status(200).json({
      success: true,
      atm,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ATM",
      error: error.message,
    });
  }
});

router.put("/update-atm/:id", async (req, res) => {
  try {
    const atm = await Atm.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!atm) {
      return res.status(404).json({
        success: false,
        message: "ATM not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "ATM updated successfully",
      atm,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update ATM",
      error: error.message,
    });
  }
});

router.delete("/delete-atm/:id", async (req, res) => {
  try {
    const atm = await Atm.findByIdAndDelete(req.params.id);

    if (!atm) {
      return res.status(404).json({
        success: false,
        message: "ATM not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "ATM deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete ATM",
      error: error.message,
    });
  }
});

module.exports = router;