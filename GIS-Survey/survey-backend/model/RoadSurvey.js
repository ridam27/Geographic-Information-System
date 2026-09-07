const mongoose = require("mongoose");   // ✅ REQUIRED

const roadSurveySchema = new mongoose.Schema({
  surveyType: {
    type: String,
    default: "road",
  },

  geometry: {
    type: Object,
    required: true,
  },

  centroid: {
    type: [Number], // [lng, lat]
    required: true,
  },

  kmlData: {
    type: String,
  },

  kmlFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  kmlUrl: {
    type: String,
    default: null,
  },

  hasVideo: {
    type: Boolean,
    default: true,
  },

  videoUrl: {
    type: String,
    default: "",
  },

  createdFrom: {
    type: String,
    default: "digital-twin",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ EXPORT MODEL (IMPORTANT)
module.exports = mongoose.model("RoadSurvey", roadSurveySchema);
