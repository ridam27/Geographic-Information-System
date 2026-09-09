const mongoose = require('mongoose');

// Metadata-only record for an uploaded GIS file (KMZ/TIF/KML). The actual
// bytes live on disk (or, later, object storage) under backend/uploads/gis —
// this document just points at them so the frontend can restore a file by
// `fileId` after a refresh without re-uploading.
const gisFileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true, index: true },
  fileType: { type: String, enum: ['kmz', 'kml', 'tif'], required: true },
  originalName: { type: String, required: true },
  storedFileName: { type: String, required: true }, // name on disk under uploads/gis
  mimeType: { type: String },
  size: { type: Number, required: true },

  // Not enforced yet, but kept from day one so files can be scoped to a
  // user/project later without a schema migration.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, index: true, default: null },

  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GisFile', gisFileSchema);
