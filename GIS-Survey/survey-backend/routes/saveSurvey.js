// routes/saveSurvey.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Survey = require('../models/Survey');

// Helper: upload KML string to GridFS, returns Promise that resolves fileId
function uploadKmlToGridFS(fileName, kmlString) {
  return new Promise((resolve, reject) => {
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    const buffer = Buffer.from(kmlString, 'utf8');
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: 'application/vnd.google-earth.kml+xml',
      metadata: { uploadedAt: new Date() }
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id);
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });
  });
}

// POST /api/save-survey
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data) return res.status(400).json({ message: 'Missing body' });

    // Create base survey object
    const surveyObj = {
      propertyName: data.propertyName || '',
      houseNumber: data.houseNumber || '',
      ownerName: data.ownerName || '',
      occupierName: data.occupierName || '',
      propertyAddress: data.propertyAddress || '',
      usageOfProperty: data.usageOfProperty || '',
      totalArea: data.totalArea || '',
      location: data.location || undefined,
      accuracy: data.accuracy || null,
    };

    // If frontend sent kmlData (string), we handle it:
    if (typeof data.kmlData === 'string' && data.kmlData.trim().length > 0) {
      const fileName = `${surveyObj.houseNumber || surveyObj.propertyName || 'survey'}.kml`;

      // Attempt GridFS upload (recommended). If GridFS fails, still store kml text in doc.
      try {
        const fileId = await uploadKmlToGridFS(fileName, data.kmlData);
        surveyObj.kmlFileId = fileId;
        // Optionally *also* store a small preview / text copy:
        surveyObj.kmlData = data.kmlData.slice(0, 10000); // store only first 10k chars to avoid huge docs
      } catch (uploadErr) {
        console.error('GridFS upload error — falling back to storing KML text:', uploadErr);
        surveyObj.kmlData = data.kmlData; // fallback: store whole KML text
      }
    }

    const saved = await Survey.create(surveyObj);
    res.json({ message: 'Survey saved', id: saved._id, kmlFileId: saved.kmlFileId || null });
  } catch (err) {
    console.error('save-survey error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
