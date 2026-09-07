const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    data: { type: String, required: true }, // Store file content as a string
    uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('File', fileSchema);
