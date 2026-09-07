// routes/gridKml.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// POST /api/kml/grid-upload
// body: { fileName: string, kmlString: string }
router.post('/grid-upload', async (req, res) => {
  try {
    const { fileName, kmlString } = req.body;
    if (!fileName || !kmlString) return res.status(400).json({ message: 'Missing fileName or kmlString' });

    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    const buffer = Buffer.from(kmlString, 'utf8');
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: 'application/vnd.google-earth.kml+xml',
      metadata: { uploadedAt: new Date() }
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      res.json({ message: 'Uploaded to GridFS', fileId: uploadStream.id.toString(), fileName });
    });

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      res.status(500).json({ message: 'GridFS upload failed' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;