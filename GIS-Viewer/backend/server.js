// backend/server.js

const path = require('path');
const fs = require('fs');
// Must run before any local module is required — ssoRoutes.js (and others)
// read process.env into top-level consts at require-time, so loading env
// vars after those requires would leave them permanently undefined.
const backendEnv = path.join(__dirname, '.env');
const rootEnv = path.join(__dirname, '../.env');
require('dotenv').config({ path: fs.existsSync(backendEnv) ? backendEnv : rootEnv });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const ssoRoutes = require('./routes/ssoRoutes');

const app = express();

// Load Mongo URIs from .env
const mongoPrimaryURI = process.env.MONGODB_URI || process.env.MONGODB_USER || 'mongodb://127.0.0.1:27017/react-auth';
const mongoSessionURI = process.env.MONGODB_SESSION_URI || mongoPrimaryURI;
const mongoKmlURI = process.env.MONGODB_KML || mongoPrimaryURI;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || process.env.SECREAT_KEY || 'dev-session-secret';
const allowedOrigins = [
  'http://localhost:3005',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean),
];

app.set('trust proxy', 1);

// Middleware
// For development, configure CORS to allow credentials from your React dev server
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const clean = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(clean) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean) || !isProduction) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const proxyToPotholeApi = async (req, res) => {
  const apiUrl = process.env.POTHOLE_API_URL;
  if (!apiUrl) {
    return res.status(503).json({ message: 'POTHOLE_API_URL is not configured.' });
  }

  try {
    const apiBaseUrl = /^https?:\/\//i.test(apiUrl) ? apiUrl : `http://${apiUrl}`;
    const targetUrl = new URL(req.originalUrl, apiBaseUrl);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];
    delete headers.connection;
    headers['content-type'] = 'application/json';

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Pothole API proxy error:', error.message);
    res.status(502).json({ message: 'Could not reach pothole API.' });
  }
};

// Session Middleware
let store;
try {
  store = MongoStore.create({
    mongoUrl: mongoSessionURI,
    collectionName: 'sessions',
  });
} catch (e) {
  console.warn('⚠️ MongoStore creation warning, using MemoryStore for sessions.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: process.env.SESSION_COOKIE_SAMESITE || 'lax',
    secure: isProduction,
  }
}));

// Static file serving for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =======================================================
//  API Routes (SHOULD BE BEFORE SERVING REACT APP)
// =======================================================
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/dashboard/users', userRoutes);
app.use('/api/dashboard/files', fileRoutes);
app.use('/sso', ssoRoutes); // Master Auth Server SSO handoff (Authentication Source 1)
app.use(['/api/track', '/api/get_track', '/api/save_csv'], proxyToPotholeApi);

// =======================================================
//  SERVE REACT APP
// =======================================================
const buildPath = path.join(__dirname, '../build');
const publicPath = path.join(__dirname, '../public');
const buildIndex = path.join(buildPath, 'index.html');
const publicIndex = path.join(publicPath, 'index.html');

app.use((req, res, next) => {
  if (require('fs').existsSync(buildPath)) {
    return express.static(buildPath)(req, res, next);
  }
  if (require('fs').existsSync(publicPath)) {
    return express.static(publicPath)(req, res, next);
  }
  next();
});

app.get('*', (req, res) => {
  if (require('fs').existsSync(buildIndex)) {
    return res.sendFile(buildIndex, (err) => {
      if (err && !res.headersSent) {
        if (require('fs').existsSync(publicIndex)) {
          let html = require('fs').readFileSync(publicIndex, 'utf8');
          html = html.replace(/%PUBLIC_URL%\//g, './').replace(/%PUBLIC_URL%/g, '.');
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        } else {
          res.status(200).send('GIS-Viewer application page.');
        }
      }
    });
  }

  if (require('fs').existsSync(publicIndex)) {
    let html = require('fs').readFileSync(publicIndex, 'utf8');
    html = html.replace(/%PUBLIC_URL%\//g, './').replace(/%PUBLIC_URL%/g, '.');
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  res.send('GIS-Viewer Backend is running.');
});

// MongoDB Connections
async function connectMongoDB() {
  try {
    await mongoose.connect(mongoPrimaryURI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    console.log('Primary MongoDB connected');
  } catch (err) {
    console.warn(`⚠️ Primary MongoDB connection failed (${err.message}). Running in fallback mode.`);
  }
}
connectMongoDB();

let kmlDbConnection = null;
try {
  kmlDbConnection = mongoose.createConnection(mongoKmlURI, {
    serverSelectionTimeoutMS: 3000,
  });
  kmlDbConnection
    .once('open', () => console.log('KML MongoDB connected'))
    .on('error', (err) => console.warn('Failed to connect to KML MongoDB:', err.message));
} catch (e) {
  console.warn('KML MongoDB connection error:', e.message);
}

module.exports = { kmlDbConnection };

// Start the server
const PORT = process.env.PORT || 4005;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
