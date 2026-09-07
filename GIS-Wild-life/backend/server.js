require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Project = require('./models/Project');

const app = express();
const PORT = process.env.PORT || 4003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For JSON/GPX payload
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage setup for videos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads', 'videos');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Database connection
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    // Transform _id to id to match frontend expectation
    const formatted = projects.map(p => {
      const doc = p.toObject();
      doc.id = doc._id.toString();
      return doc;
    });
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// GET a single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    const doc = p.toObject();
    doc.id = doc._id.toString();
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching project' });
  }
});

// POST a new project
app.post('/api/projects', upload.single('video'), async (req, res) => {
  try {
    const { title, slug, description, date, time, status, jsonObj, gpxText } = req.body;
    
    const newProject = new Project({
      title,
      slug,
      description,
      date,
      time,
      status: status || 'active',
      jsonObj: jsonObj ? JSON.parse(jsonObj) : null,
      gpxText: gpxText || null
    });

    if (req.file) {
      newProject.videoPath = '/uploads/videos/' + req.file.filename;
      newProject.videoName = req.file.originalname;
      newProject.videoType = req.file.mimetype;
    }

    const savedProject = await newProject.save();
    const doc = savedProject.toObject();
    doc.id = doc._id.toString();
    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error creating project' });
  }
});

// PUT update a project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    const doc = updated.toObject();
    doc.id = doc._id.toString();
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating project' });
  }
});

// PATCH update project status
app.patch('/api/projects/:id/status', async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    p.status = p.status === 'active' ? 'inactive' : 'active';
    await p.save();
    const doc = p.toObject();
    doc.id = doc._id.toString();
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating project status' });
  }
});

// DELETE a project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Project not found' });
    
    // Delete associated video file if it exists
    if (p.videoPath) {
      const filePath = path.join(__dirname, p.videoPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting project' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
