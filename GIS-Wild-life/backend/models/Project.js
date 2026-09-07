const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: ''
  },
  time: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'active'
  },
  videoPath: {
    type: String,
    default: null
  },
  videoName: {
    type: String,
    default: null
  },
  videoType: {
    type: String,
    default: null
  },
  jsonObj: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  gpxText: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
