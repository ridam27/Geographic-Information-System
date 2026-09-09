// backend/routes/gisFileRoutes.js
//
// Persistent storage for uploaded GIS files (KMZ/TIF/KML) so the frontend
// can restore them by `fileId` after a page refresh instead of losing the
// upload. Follows the same disk-storage-plus-metadata pattern as
// kmlRoutes.js, but keeps the file on disk (backend/uploads/gis) rather
// than storing the binary inside MongoDB — Mongo here only holds
// references/metadata (see models/GisFile.js).
//
// Swapping the disk storage for an object store (S3, GCS, Azure Blob, etc.)
// later only touches this file: `storagePathFor`/`upload`/the GET and
// DELETE handlers are the only places that know files live on local disk.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const GisFile = require('../models/GisFile');
const auth = require('../middleware/authMiddleware');

const uploadsDir = path.join(__dirname, '../uploads/gis');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = {
  '.kmz': 'kmz',
  '.kml': 'kml',
  '.tif': 'tif',
  '.tiff': 'tif',
};

const MAX_FILE_SIZE_MB = Number(process.env.GIS_FILE_MAX_SIZE_MB) || 300;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS[ext]) {
      return cb(new Error('Only .kmz, .kml and .tif/.tiff files are allowed.'));
    }
    cb(null, true);
  },
});

// POST /api/gis-files/upload — store a new file, return its fileId.
router.post('/upload', auth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const status = err.message.startsWith('Only .kmz') ? 400 : 413;
      return res.status(status).json({ message: err.message });
    }

    const { file } = req;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
      const ext = path.extname(file.originalname).toLowerCase();
      const fileType = ALLOWED_EXTENSIONS[ext];
      const fileId = path.parse(file.filename).name; // uuid used as filename stem

      const record = await GisFile.create({
        fileId,
        fileType,
        originalName: file.originalname,
        storedFileName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        userId: req.user?._id || req.user?.id || null,
      });

      res.status(201).json({
        fileId: record.fileId,
        fileType: record.fileType,
        originalName: record.originalName,
        size: record.size,
        uploadedAt: record.uploadedAt,
      });
    } catch (error) {
      // Clean up the orphaned disk file if the metadata write failed.
      fs.unlink(file.path, () => {});
      console.error('Error saving GIS file metadata:', error);
      res.status(500).json({ message: 'Server error while saving file metadata.' });
    }
  });
});

// GET /api/gis-files — list the current user's files (optionally filtered by ?fileType=).
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const query = { userId };
    if (req.query.fileType) query.fileType = req.query.fileType;

    const files = await GisFile.find(query)
      .sort({ uploadedAt: -1 })
      .select('fileId fileType originalName size uploadedAt');

    res.json(files);
  } catch (error) {
    console.error('Error listing GIS files:', error);
    res.status(500).json({ message: 'Server error while listing files.' });
  }
});

// GET /api/gis-files/:fileId — download the original bytes back.
router.get('/:fileId', auth, async (req, res) => {
  try {
    const record = await GisFile.findOne({ fileId: req.params.fileId });
    if (!record) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const requesterId = String(req.user?._id || req.user?.id || '');
    if (record.userId && String(record.userId) !== requesterId) {
      return res.status(403).json({ message: 'You do not have access to this file.' });
    }

    const filePath = path.join(uploadsDir, record.storedFileName);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return res.status(410).json({ message: 'File metadata exists but the file itself is missing.' });
    }

    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(record.originalName)}"`
    );

    const readStream = fs.createReadStream(filePath);
    readStream.on('error', (streamErr) => {
      console.error(`Error streaming GIS file "${record.fileId}":`, streamErr);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Server error while streaming file.' });
      } else {
        res.destroy(streamErr);
      }
    });
    readStream.pipe(res);
  } catch (error) {
    console.error('Error fetching GIS file:', error);
    res.status(500).json({ message: 'Server error while fetching file.' });
  }
});

// DELETE /api/gis-files/:fileId — remove the file and its metadata.
router.delete('/:fileId', auth, async (req, res) => {
  try {
    const record = await GisFile.findOne({ fileId: req.params.fileId });
    if (!record) {
      return res.status(404).json({ message: 'File not found.' });
    }

    const requesterId = String(req.user?._id || req.user?.id || '');
    if (record.userId && String(record.userId) !== requesterId) {
      return res.status(403).json({ message: 'You do not have access to this file.' });
    }

    await GisFile.deleteOne({ _id: record._id });
    fs.unlink(path.join(uploadsDir, record.storedFileName), () => {});

    res.json({ message: 'File deleted.' });
  } catch (error) {
    console.error('Error deleting GIS file:', error);
    res.status(500).json({ message: 'Server error while deleting file.' });
  }
});

module.exports = router;
