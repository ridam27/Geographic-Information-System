const express = require('express');
const router = express.Router();
const File = require('../models/Files');

router.post('/upload', async (req, res) => {
    try {
        const { name, data } = req.body;

        if (!name || !data) {
            return res.status(400).json({ message: 'File name and data are required.' });
        }

        const file = new File({ name, data });
        await file.save();

        res.status(201).json({ message: 'File uploaded successfully.' });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
