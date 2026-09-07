const express = require("express");
const PropertyForm = require("../models/PropertyForm");

const router = express.Router();

const { FORM_TYPES, FORM_TYPE_LABELS, normalizeFormType } = PropertyForm;

function parseDateOrUndefined(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

// =========================
// Create a Namuna / Notice / Appeal / Hearing form for a property
// =========================
router.post("/add", async (req, res) => {
  try {
    const {
      house_id,
      formType,
      referenceNo,
      date,
      reason,
      hearingDate,
      hearingOfficer,
      status,
      remarks,
    } = req.body;

    if (!house_id) {
      return res.status(400).json({
        success: false,
        message: "house_id is required",
      });
    }

    const normalizedType = normalizeFormType(formType);

    if (!normalizedType) {
      return res.status(400).json({
        success: false,
        message: `formType must be one of: ${FORM_TYPES.join(", ")}`,
      });
    }

    const propertyForm = await PropertyForm.create({
      house_id,
      formType: normalizedType,
      referenceNo,
      date: parseDateOrUndefined(date),
      reason,
      hearingDate: parseDateOrUndefined(hearingDate),
      hearingOfficer,
      status,
      remarks,
    });

    return res.status(201).json({
      success: true,
      message: `${FORM_TYPE_LABELS[normalizedType]} saved successfully`,
      propertyForm,
    });
  } catch (error) {
    console.error("Error saving property form:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save property form",
      error: error.message,
    });
  }
});

// =========================
// Get all forms for a property (optionally filtered by ?type=notice)
// =========================
router.get("/:houseId", async (req, res) => {
  try {
    const { houseId } = req.params;
    const { type } = req.query;

    const query = { house_id: houseId };

    if (type) {
      const normalizedType = normalizeFormType(type);
      if (!normalizedType) {
        return res.status(400).json({
          success: false,
          message: `type must be one of: ${FORM_TYPES.join(", ")}`,
        });
      }
      query.formType = normalizedType;
    }

    const forms = await PropertyForm.find(query).sort({ date: -1, createdAt: -1 });

    return res.status(200).json(forms);
  } catch (error) {
    console.error("Error fetching property forms:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch property forms",
      error: error.message,
    });
  }
});

module.exports = router;
