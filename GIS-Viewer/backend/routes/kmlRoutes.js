const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FileModel = require('../models/KML');
const auth = require('../middleware/authMiddleware')

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Set up multer for file upload with size limit
const upload = multer({ 
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB file size limit
});

router.post('/upload', auth,upload.single('kml'), async (req, res) => {
    try {
        const { file } = req;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        // Validate file extension
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (fileExtension !== '.kml') {
            return res.status(400).json({ message: 'Invalid file type. Only KML files are allowed' });
        }

        // Validate MIME type
        const allowedMimeTypes = ['application/vnd.google-earth.kml+xml', 'application/xml'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({ message: 'Invalid MIME type. Only KML files are allowed' });
        }

        // Read file content
        const fileContent = fs.readFileSync(file.path);
        if (!fileContent) {
            return res.status(400).json({ message: 'Failed to read file content' });
        }

        // Save file to MongoDB
        const newFile = new FileModel({
            fileName: file.originalname,
            kmlData: fileContent, // Store binary data
            contentType: file.mimetype, // Store MIME type
        });

        const savedFile = await newFile.save();

        // Clean up the uploaded file
        fs.unlinkSync(file.path);

        res.status(201).json({ message: 'File uploaded and saved to MongoDB', id: savedFile._id });
    } catch (error) {
        console.error('Error uploading file:', error.message);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

module.exports = router;
