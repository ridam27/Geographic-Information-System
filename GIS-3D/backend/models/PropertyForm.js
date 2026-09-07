const mongoose = require("mongoose");

const FORM_TYPES = ["namuna", "notice", "appeal", "hearing"];

const FORM_TYPE_LABELS = {
  namuna: "Namuna",
  notice: "Notice",
  appeal: "Appeal",
  hearing: "Hearing",
};

function normalizeFormType(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (FORM_TYPES.includes(normalized)) {
    return normalized;
  }

  return "";
}

const propertyFormSchema = new mongoose.Schema({
  // Same house/property linkage convention used by the Banner model,
  // so it works with the existing alias lookup (Property Number, _id, etc.)
  house_id: {
    type: String,
    required: true,
    trim: true,
  },

  formType: {
    type: String,
    required: true,
    enum: FORM_TYPES,
    set: normalizeFormType,
  },

  // Namuna No. / Notice No. / Appeal No. / Hearing Ref No.
  referenceNo: {
    type: String,
    trim: true,
  },

  // Date the namuna/notice/appeal was issued or filed.
  date: {
    type: Date,
  },

  // Notice reason / Appeal reason / Namuna subject.
  reason: {
    type: String,
    trim: true,
  },

  // Used mainly by "hearing" (and optionally "appeal") entries.
  hearingDate: {
    type: Date,
  },

  hearingOfficer: {
    type: String,
    trim: true,
  },

  status: {
    type: String,
    trim: true,
    default: "Pending",
  },

  remarks: {
    type: String,
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

propertyFormSchema.index({ house_id: 1, formType: 1 });

module.exports = mongoose.model("PropertyForm", propertyFormSchema);
module.exports.FORM_TYPES = FORM_TYPES;
module.exports.FORM_TYPE_LABELS = FORM_TYPE_LABELS;
module.exports.normalizeFormType = normalizeFormType;
