// backend/server.js

const path = require('path');
// Must run before any local module is required — ssoRoutes.js (and others)
// read process.env into top-level consts at require-time, so loading env
// vars after those requires would leave them permanently undefined.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const ssoRoutes = require('./routes/ssoRoutes');
const gisFileRoutes = require('./routes/gisFileRoutes');

const app = express();

// Load Mongo URIs from .env
const mongoPrimaryURI = process.env.MONGODB_URI || process.env.MONGODB_USER || 'mongodb://127.0.0.1:27017/react-auth';
const mongoSessionURI = process.env.MONGODB_SESSION_URI || mongoPrimaryURI;
const mongoKmlURI = process.env.MONGODB_KML || mongoPrimaryURI;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || process.env.SECREAT_KEY || 'dev-session-secret';
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean),
];

app.set('trust proxy', 1);

// Middleware
// For development, configure CORS to allow credentials from your React dev server
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
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
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // Changed to false for better practice
  store: MongoStore.create({
    mongoUrl: mongoSessionURI,
    collectionName: 'sessions',
  }),
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
app.use('/api/gis-files', gisFileRoutes); // Persistent KMZ/TIF/KML storage (survives refresh)
app.use('/sso', ssoRoutes); // Master Auth Server SSO handoff (Authentication Source 1)
app.use(['/api/track', '/api/get_track', '/api/save_csv'], proxyToPotholeApi);

// =======================================================
//  SERVE REACT APP
// =======================================================
// Runs in production, and also in local dev when a build/ folder exists —
// serving the SPA from the same origin as this API keeps the SSO session
// cookie first-party (SameSite=Lax) instead of needing cross-origin cookies
// between a separate CRA dev server and this backend.
const buildPath = path.join(__dirname, '../build');
if (isProduction || require('fs').existsSync(buildPath)) {
  app.use(express.static(buildPath));

  // Catch-all route to serve index.html for any request that doesn't match an API route
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
}

// MongoDB Connections
mongoose.connect(mongoPrimaryURI)
  .then(() => console.log('Primary MongoDB connected'))
  .catch((err) => {
    console.error('Failed to connect to Primary MongoDB:', err.message);
    process.exit(1);
  });

const kmlDbConnection = mongoose.createConnection(mongoKmlURI);
kmlDbConnection
  .once('open', () => console.log('KML MongoDB connected'))
  .on('error', (err) => console.error('Failed to connect to KML MongoDB:', err.message));

module.exports = { kmlDbConnection };

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
