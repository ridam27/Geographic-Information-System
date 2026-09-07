require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const RoadSurvey = require('./model/RoadSurvey'); // import RoadSurvey model
const authMiddleware = require('./middleware/authMiddleware');
const authRoutes = require('./routes/authRoutes');
const Appeal = require("./model/Appeal");
const appealRoutes = require("./routes/appealRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const hearingRoutes = require("./routes/hearingRoutes");
const namuna43Routes = require("./routes/namuna43Routes");
// ocrRoutes (HTR) removed


const app = express();
const PORT = process.env.PORT || 4002;

// If behind a proxy/NGINX that terminates TLS, enable this so req.protocol reflects original protocol
// app.set('trust proxy', true);

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // allow scanned uploads encoded as base64
app.use(express.urlencoded({ extended: true }));
app.use("/videos", express.static("videos"));
app.use('/api/auth', authRoutes);
app.use('/api', appealRoutes);  
app.use("/api", propertyRoutes);
app.use("/api", noticeRoutes);
app.use("/api", hearingRoutes);
app.use("/api", namuna43Routes);
// HTR route removed; no backend HTR mounted

const openaiRoutes = require('./routes/openaiRoutes');
app.use('/api', openaiRoutes); // Added openaiRoutes

const ssoRoutes = require('./routes/ssoRoutes');
app.use('/sso', ssoRoutes); // Master Auth Server SSO handoff

// --- MongoDB Connection ---
const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/survey';

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log('Successfully connected to MongoDB! (Database: survey)');
  } catch (err) {
    console.warn(`⚠️ Primary MongoDB connection failed (${err.message}).`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri('survey');
      process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
      process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
      console.log(`[dev] In-memory MongoDB ready at ${memoryUri}`);
      await mongoose.connect(memoryUri);
      console.log('Successfully connected to In-Memory MongoDB! (Database: survey)');
    } catch (memErr) {
      console.warn('⚠️ Running without active MongoDB connection (SSO authentication will operate in fallback mode).');
    }
  }
}
connectDB();

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    database: mongoose.connection.name || null,
  });
});

// ---------------------------------------------------------------------------
// Schema (kept your original fields, added centroid + style for convenience)
// ---------------------------------------------------------------------------
const surveySchema = new mongoose.Schema({
  propertyNumber: { type: String },
  assessmentYear: { type: String },
  oldAssessmentValue: { type: String },
  oldAssessmentYear: { type: String },

  ownerName: { type: String, required: true },
  ownerUID: { type: String },
  ownerType: { type: String },
  occupierName: { type: String },
  occupierUID: { type: String },

  propertyAddress: { type: String, required: true },
  propertyName: { type: String },
  pinCode: { type: String },

  latitude: { type: String },
  longitude: { type: String },

  propertyCategory: { type: String },
  natureOfProperty: { type: String },
  usageOfProperty: { type: String },

  ageOfBuilding: { type: String },
  mobileNumber: { type: String },
  email: { type: String },
  totalArea: { type: String },
  yearOfConstruction: { type: String },

  floorNumber: { type: String },
  floorArea: { type: String },
  floorConstructionType: { type: String },
  floorUseType: { type: String },
  shopOfficeNumber: { type: String },

  accuracy: { type: Number },

  kmlData: { type: String },
  kmlFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  kmlUrl: { type: String, default: null },

  // GeoJSON Point for location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0]
    }
  },

  // Raw GeoJSON Polygon/MultiPolygon geometry submitted from the frontend
  // survey form. This was missing from the schema, so even though the
  // handler generated a KML file and a centroid Point, Mongoose stripped
  // any geometry field before saving (strict schema mode) and the 3D
  // platform only ever received a single point, never the actual polygon.
  geometry: {
    type: Object,
    default: undefined
  },

  // convenience: centroid and style used for KML generation & quick client use
  centroid: { type: [Number], default: undefined }, // [lng, lat]
  style: {
    color: { type: String, default: '#7f7f7f' }, // "#RRGGBB"
    opacity: { type: Number, default: 0.5 },
    markerType: { type: String, default: 'square' }
  }
}, { timestamps: true },);



surveySchema.index({ location: '2dsphere' });

const SurveyEntry = mongoose.model('SurveyEntry', surveySchema);

// ---------------------------------------------------------------------------
// GridFS upload helper (you already had this) - returns ObjectId
// ---------------------------------------------------------------------------
function uploadKmlToGridFS(fileName, kmlString) {
  return new Promise((resolve, reject) => {
    const db = mongoose.connection.db;
    if (!db) return reject(new Error('MongoDB not connected'));

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });
    const buffer = Buffer.from(kmlString, 'utf8');
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: 'application/vnd.google-earth.kml+xml',
      metadata: { uploadedAt: new Date() }
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', (err) => reject(err));
  });
}

// ---------------------------------------------------------------------------
// USAGE → STYLE mapping (adjust colors here)
// store colors as "#RRGGBB"
const USAGE_STYLES = {
  default:                { color: '#2975cc' }  // Professional Blue (fallback)
};

function getStyleForUsage(usage) {
  const key = (usage || '').toLowerCase();
  const base = USAGE_STYLES[key] || USAGE_STYLES.default;
  return { color: base.color, opacity: 0.5, markerType: 'square' };
}

// ---------------------------------------------------------------------------
// KML helpers
// - hexToKmlColor: "#RRGGBB" -> "AABBGGRR" (alphaHex='80' => 50%)
// - geojsonPolygonToKmlCoords: polygon coords -> "lon,lat,0 lon,lat,0 ..."
// - simpleCentroid: average of ring vertices
// - buildKmlForParcel: returns full KML string with style + SURVEY POINT marker
// ---------------------------------------------------------------------------
function hexToKmlColor(hex, alphaHex = '80') {
  const h = (hex || '').replace('#','');
  if (h.length !== 6) throw new Error('Invalid hex color: ' + hex);
  const r = h.slice(0,2), g = h.slice(2,4), b = h.slice(4,6);
  return (alphaHex + b + g + r).toLowerCase();
}

function geojsonPolygonToKmlCoords(polygonCoords) {
  // Accept either [ [ [lng,lat], ... ] ] or [ [lng,lat], ... ]
  const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;
  const closed = ring.slice();
  const first = ring[0], last = ring[ring.length - 1];
  if (!first || !last) return '';
  if (first[0] !== last[0] || first[1] !== last[1]) closed.push([first[0], first[1]]);
  return closed.map(([lng,lat]) => `${lng},${lat},0`).join(' ');
}

function simpleCentroid(polygonCoords) {
  const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;
  let sumX = 0, sumY = 0;
  for (const [x,y] of ring) { sumX += x; sumY += y; }
  const n = ring.length || 1;
  return [sumX / n, sumY / n];
}

// Minimal XML escape for name/description fields
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
       default:  return c; // explicit default to satisfy eslint "default-case"
    }
  });
}

// Build KML string with polygon + SURVEY POINT marker (inline SVG for polygon marker stays)
// NOTE: surveyObj is optional — if it contains latitude/longitude those will be used for the survey point.
// Otherwise the centroid will be used as a fallback.
function buildKmlForParcel({
  name = 'parcel',
  polygonCoords,
  colorHex = '#7f7f7f',
  description = '',
  surveyObj = {}
}) {
  const kmlColor = hexToKmlColor(colorHex, '80'); // 50% alpha
  const coords = geojsonPolygonToKmlCoords(polygonCoords);

  // ----------------------------------------------------------
  // IMPORTANT CHANGE:
  // Always use centroid of THIS polygon as the Survey Point
  // ----------------------------------------------------------
  const [centroidLon, centroidLat] = simpleCentroid(polygonCoords);
  const surveyLon = centroidLon;
  const surveyLat = centroidLat;

  // Description block (optional)
  const surveyDescriptionHtml = `<![CDATA[
    <b>Owner:</b> ${escapeXml(surveyObj?.ownerName || '')}<br/>
    <b>Occupier:</b> ${escapeXml(surveyObj?.occupierName || '')}<br/>
    <b>Address:</b> ${escapeXml(surveyObj?.propertyAddress || '')}<br/>
    <b>Usage:</b> ${escapeXml(surveyObj?.usageOfProperty || '')}<br/>
    <b>Total Area:</b> ${escapeXml(surveyObj?.totalArea || '')}
  ]]>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(name)}</name>
    <description>${escapeXml(description)}</description>

    <Style id="parcel-style">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlColor}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>

    <!-- Polygon -->
    <Placemark>
      <name>${escapeXml(name)}</name>
      <styleUrl>#parcel-style</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <!-- SURVEY POINT (unique for each polygon) -->
    <Placemark>
      <name>Survey Point</name>
      <description>${surveyDescriptionHtml}</description>
      <Style>
        <IconStyle>
          <scale>1.2</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${surveyLon},${surveyLat},0</coordinates>
      </Point>
    </Placemark>

  </Document>
</kml>`;
}


// ---------------------------------------------------------------------------
// /api/save-survey
// - Accepts survey payload. If polygons/polygon/geometry is present, generate & upload KML.
// - If frontend supplied kmlData, upload that instead.
// ---------------------------------------------------------------------------
app.post('/api/save-survey', async (req, res) => {
  try {
    console.log('Received data for "survey" DB:', req.body);
    const data = req.body;

    // Build base survey object
    const surveyObj = {
      propertyNumber: data.propertyNumber || data.houseNumber || '',
      assessmentYear: data.assessmentYear || '',
      oldAssessmentValue: data.oldAssessmentValue || '',
      oldAssessmentYear: data.oldAssessmentYear || '',
      ownerName: data.ownerName || '',
      ownerUID: data.ownerUID || '',
      ownerType: data.ownerType || '',
      occupierName: data.occupierName || '',
      occupierUID: data.occupierUID || '',
      propertyAddress: data.propertyAddress || '',
      propertyName: data.propertyName || '',
      pinCode: data.pinCode || '',
      latitude: data.location && Array.isArray(data.location.coordinates) ? String(data.location.coordinates[1]) : (data.latitude || ''),
      longitude: data.location && Array.isArray(data.location.coordinates) ? String(data.location.coordinates[0]) : (data.longitude || ''),
      propertyCategory: data.propertyCategory || '',
      natureOfProperty: data.natureOfProperty || '',
      usageOfProperty: data.usageOfProperty || '',
      ageOfBuilding: data.ageOfBuilding || '',
      mobileNumber: data.mobileNumber || '',
      email: data.email || '',
      totalArea: data.totalArea || '',
      yearOfConstruction: data.yearOfConstruction || '',
      floorNumber: data.floorNumber || '',
      floorArea: data.floorArea || '',
      floorConstructionType: data.floorConstructionType || '',
      floorUseType: data.floorUseType || '',
      shopOfficeNumber: data.shopOfficeNumber || '',
      accuracy: data.accuracy || null,
      kmlData: undefined,
      kmlFileId: null,
      kmlUrl: null,
      location: data.location || { type: 'Point', coordinates: [0, 0] },
      centroid: undefined,
      style: undefined
    };

    // ---------------------------
    // 1) If frontend provided polygons FeatureCollection, handle it
    // ---------------------------
    let polygonGeoJson = null; // { type: 'Polygon'|'MultiPolygon', coordinates: [...] }
    let polygonUsage = surveyObj.usageOfProperty || 'default';
    let polygonDescription = '';

    // Accept FeatureCollection (polygons) from frontend: use first polygon feature
    if (data.polygons && data.polygons.type === 'FeatureCollection' && Array.isArray(data.polygons.features) && data.polygons.features.length > 0) {
      const first = data.polygons.features[0];
      if (first.geometry && ['Polygon','MultiPolygon'].includes(first.geometry.type)) {
        polygonGeoJson = { type: first.geometry.type, coordinates: first.geometry.coordinates };
        polygonUsage = first.properties?.usageOfProperty || polygonUsage;
        // try to build a short description from properties
        polygonDescription = first.properties?.description || '';
      }
    }

    // Accept direct polygon geometry
    if (!polygonGeoJson && data.polygon && ['Polygon','MultiPolygon'].includes(data.polygon.type)) {
      polygonGeoJson = { type: data.polygon.type, coordinates: data.polygon.coordinates };
      polygonUsage = data.polygon.properties?.usageOfProperty || polygonUsage;
    }

    // Accept data.geometry (legacy)
    if (!polygonGeoJson && data.geometry && ['Polygon','MultiPolygon'].includes(data.geometry.type)) {
      polygonGeoJson = { type: data.geometry.type, coordinates: data.geometry.coordinates };
    }

    // ---------------------------
    // 2) If polygonGeoJson found -> compute centroid, style, generate KML and upload
    // ---------------------------
    if (polygonGeoJson) {
      try {
        // Persist the actual polygon/multipolygon geometry so the 3D
        // platform can render the real shape instead of a single point.
        surveyObj.geometry = polygonGeoJson;

        const centroid = simpleCentroid(polygonGeoJson.coordinates);
        surveyObj.centroid = centroid;
        // set location to centroid if no meaningful location provided
        if (!data.location || !Array.isArray(data.location.coordinates) || (data.location.coordinates[0] === 0 && data.location.coordinates[1] === 0)) {
          surveyObj.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };
          surveyObj.latitude = String(centroid[1]);
          surveyObj.longitude = String(centroid[0]);
        }

        // style from usage
        const style = getStyleForUsage(polygonUsage);
        surveyObj.style = style;

        // build KML string (50% opacity)
        const kmlString = buildKmlForParcel({
          name: surveyObj.propertyName || surveyObj.propertyNumber || 'Parcel',
          polygonCoords: polygonGeoJson.coordinates,
          colorHex: style.color,
          description: polygonDescription || (`Usage: ${polygonUsage}`),
          surveyObj // <-- minimal change: pass survey object so SURVEY POINT uses stored lat/lng & data
        });

        // upload to GridFS
        const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
        try {
          const fileId = await uploadKmlToGridFS(fileName, kmlString);
          surveyObj.kmlFileId = fileId;
          surveyObj.kmlData = kmlString.length > 20000 ? kmlString.slice(0, 20000) : kmlString;
          const host = req.headers.host;
          const protocol = req.protocol;
          surveyObj.kmlUrl = `${protocol}://${host}/api/kml/public/${fileId.toString()}`;
        } catch (uploadErr) {
          console.error('Failed to upload generated KML to GridFS:', uploadErr);
          // fallback: store KML inline
          surveyObj.kmlData = kmlString;
        }
      } catch (err) {
        console.error('Error processing polygon:', err);
        // continue — don't fail whole request, but log and proceed with saving base survey
      }
    } else if (typeof data.kmlData === 'string' && data.kmlData.trim().length > 0) {
      // ---------------------------
      // 3) If frontend sent kmlData directly, upload that (your original behavior)
      // ---------------------------
      const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
      try {
        const fileId = await uploadKmlToGridFS(fileName, data.kmlData);
        surveyObj.kmlFileId = fileId;
        surveyObj.kmlData = data.kmlData.length > 20000 ? data.kmlData.slice(0, 20000) : data.kmlData;
        const host = req.headers.host;
        const protocol = req.protocol;
        surveyObj.kmlUrl = `${protocol}://${host}/api/kml/public/${fileId.toString()}`;
      } catch (uploadErr) {
        console.error('GridFS upload error — falling back to storing KML text in doc:', uploadErr);
        surveyObj.kmlData = data.kmlData;
      }
    }

    // ---------------------------
    // 4) Save document
    // ---------------------------
    const savedSurvey = await SurveyEntry.create(surveyObj);
    console.log('Data saved:', savedSurvey);

    // ------------- after saving survey to DB ------------

// Invalidate cache (if you will implement caching)
try {
  const { redisClient } = require('./redis');
  await redisClient.del('surveys:recent'); // optional — remove cached list
} catch (e) {
  console.warn('Redis del failed:', e?.message || e);
}

// Emit realtime event to connected clients (if socket initialized)
try {
  const io = req.app?.locals?.io; // we set this when initializing socket

  if (io) {
    // 1) keep old event (for admin / logs etc.)
    io.emit('survey:created', savedSurvey);

    // 2) send a 3D-ready GeoJSON Feature for your 3D platform
    let geometry = null;

    // If we had polygonGeoJson in this request, reuse it
    if (polygonGeoJson) {
      geometry = {
        type: polygonGeoJson.type || 'Polygon',
        coordinates: polygonGeoJson.coordinates
      };
    } else if (savedSurvey.location && Array.isArray(savedSurvey.location.coordinates)) {
      geometry = { type: 'Point', coordinates: savedSurvey.location.coordinates };
    } else if (Array.isArray(savedSurvey.centroid)) {
      geometry = { type: 'Point', coordinates: [savedSurvey.centroid[0], savedSurvey.centroid[1]] };
    }

    const featureFor3D = {
      type: 'Feature',
      geometry,
      properties: {
        _id: savedSurvey._id,
        propertyNumber: savedSurvey.propertyNumber,
        propertyName: savedSurvey.propertyName,
        ownerName: savedSurvey.ownerName,
        usageOfProperty: savedSurvey.usageOfProperty,
        propertyAddress: savedSurvey.propertyAddress,
        style: savedSurvey.style || { color: '#00BFFF', opacity: 0.5 },
        kmlUrl: savedSurvey.kmlUrl || null,
        totalArea: savedSurvey.totalArea,
        yearOfConstruction: savedSurvey.yearOfConstruction,
        mobileNumber: savedSurvey.mobileNumber,
        email: savedSurvey.email,
        createdAt: savedSurvey.createdAt
      }
    };

    io.emit('3d:survey:new', featureFor3D);   // 🔔 MAIN EVENT FOR 3D PLATFORM
  }
} catch (e) {
  console.warn('Socket emit failed:', e?.message || e);
}


// Publish on redis channel (optional, for external subsystems)
try {
  const { redisClient } = require('./redis');
  await redisClient.publish('surveys:events', JSON.stringify({ type: 'created', data: savedSurvey }));
} catch (e) {
  console.warn('Redis publish failed:', e?.message || e);
}


    res.status(201).json({
      message: 'Survey saved successfully!',
      data: savedSurvey,
      kmlFileId: savedSurvey.kmlFileId || null,
      kmlUrl: savedSurvey.kmlUrl || null
    });

  } catch (error) {
    console.error('Error saving to DB:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: error.message });
    }
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
});
app.post("/api/road-survey/save", authMiddleware, async (req, res) => {

  try {
    const { polygons, kmlData, hasVideo, videoUrl, createdFrom } = req.body;

    if (
      !polygons ||
      polygons.type !== "FeatureCollection" ||
      polygons.features.length === 0
    ) {
      return res.status(400).json({ message: "Polygon data required" });
    }

    const feature = polygons.features[0];
    const geometry = feature.geometry;

    // centroid calculation (simple)
    const coords = geometry.coordinates[0];
    let sumLng = 0, sumLat = 0;
    coords.forEach(([lng, lat]) => {
      sumLng += lng;
      sumLat += lat;
    });
    const centroid = [
      sumLng / coords.length,
      sumLat / coords.length
    ];

   // 1️⃣ upload KML to GridFS
let kmlFileId = null;
let kmlUrl = null;

if (kmlData) {
  const fileName = `road-survey-${Date.now()}.kml`;
  kmlFileId = await uploadKmlToGridFS(fileName, kmlData);
  kmlUrl = `${req.protocol}://${req.headers.host}/api/kml/public/${kmlFileId}`;
}

// 2️⃣ save RoadSurvey with KML URL
const roadSurvey = await RoadSurvey.create({
  geometry,
  centroid,
  kmlData,
  kmlFileId,
  kmlUrl,
  hasVideo,
  videoUrl,
  createdFrom
});


    // 🔔 realtime emit (PART-2 ready)
    const io = req.app.locals.io;
    if (io) {
      io.emit("3d:road:new", {
        type: "Feature",
        geometry,
        properties: {
          _id: roadSurvey._id,
          videoUrl: roadSurvey.videoUrl,
          hasVideo: roadSurvey.hasVideo,
          centroid: roadSurvey.centroid
        }
      });
    }

    res.status(201).json({
      message: "Road survey saved",
      data: roadSurvey
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Road survey save failed" });
  }
});




// ---------------------------------------------------------------------------
// Standalone endpoint: upload arbitrary KML string to GridFS
// ---------------------------------------------------------------------------
app.post('/api/kml/grid-upload', async (req, res) => {
  try {
    const { fileName, kmlString } = req.body;
    if (!fileName || !kmlString) return res.status(400).json({ message: 'Missing fileName or kmlString' });

    const fileId = await uploadKmlToGridFS(fileName, kmlString);
    res.json({ message: 'Uploaded to GridFS', fileId: fileId.toString(), fileName });
  } catch (err) {
    console.error('GridFS upload failed:', err);
    res.status(500).json({ message: 'GridFS upload failed', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Download GridFS file by filename
// ---------------------------------------------------------------------------
app.get('/api/kml/download/byname/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const db = mongoose.connection.db;
    if (!db) return res.status(500).send('MongoDB not connected');

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      return res.status(404).send('File not found');
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ---------------------------------------------------------------------------
// Public KML streaming by fileId (no token)
// ---------------------------------------------------------------------------
app.get('/api/kml/public/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const db = mongoose.connection.db;
    if (!db) return res.status(500).send('MongoDB not connected');

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      return res.status(404).send('File not found');
    });

    // Serve inline so clients (Google Earth Web/Pro) can fetch and open directly
    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', 'inline; filename="survey.kml"');

    downloadStream.pipe(res);
  } catch (err) {
    console.error('Public download route error:', err);
    res.status(500).send('Server error');
  }
});

// ---------------------------------------------------------------------------
// Get saved surveys
// ---------------------------------------------------------------------------
app.get('/api/get-surveys', async (req, res) => {
  try {
    const surveys = await SurveyEntry.find({}).sort({ createdAt: -1 }).limit(100);
    res.status(200).json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
});

// adding api for 3d platform data

// ------------------ 3D platform read API ------------------
// GET /api/3d/surveys       -> returns GeoJSON FeatureCollection
// GET /api/3d/surveys/:id   -> returns single Feature
app.get('/api/3d/surveys', async (req, res) => {
  try {
    const { search, limit = 500 } = req.query;
    const q = {};
    if (search) {
      const s = new RegExp(search, 'i');
      q.$or = [
        { propertyNumber: s },
        { ownerName: s },
        { propertyName: s },
        { propertyAddress: s }
      ];
    }

    const docs = await SurveyEntry.find(q).sort({ createdAt: -1 }).limit(Number(limit)).lean();

    const features = docs.map(d => {
      // use polygon/geometry if saved (you use polygons -> KML), otherwise fallback to location/centroid
      let geometry = d.geometry || null;

      if (!geometry) {
        if (d.kmlData) {
          // don't convert here (heavy) — prefer using kmlUrl in client.
          geometry = null;
        } else if (d.location && Array.isArray(d.location.coordinates)) {
          geometry = { type: 'Point', coordinates: d.location.coordinates };
        } else if (Array.isArray(d.centroid)) {
          geometry = { type: 'Point', coordinates: [d.centroid[0], d.centroid[1]] };
        }
      }

      return {
        type: 'Feature',
        geometry,
        properties: {
          _id: d._id,
          propertyNumber: d.propertyNumber,
          propertyName: d.propertyName,
          ownerName: d.ownerName,
          usageOfProperty: d.usageOfProperty,
          propertyAddress: d.propertyAddress,
          style: d.style || { color: '#00BFFF', opacity: 0.5 },
          kmlUrl: d.kmlUrl || null,
          createdAt: d.createdAt,
          // include any other fields you need in the popup:
          totalArea: d.totalArea,
          yearOfConstruction: d.yearOfConstruction,
          mobileNumber: d.mobileNumber,
          email: d.email
        }
      };
    });

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('GET /api/3d/surveys error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

app.get("/api/3d/all-data", async (req, res) => {

  const surveys = await SurveyEntry.find().lean();
  const roads = await RoadSurvey.find().lean();
  const appeals = await Appeal.find().lean();
  
const hearings = await mongoose.connection
  .collection("hearingNotices")
  .find()
  .toArray();

const notices = await mongoose.connection
  .collection("notice119")
  .find()
  .toArray();

const namuna = await mongoose.connection
  .collection("namuna43Notices")
  .find()
    .toArray();
  
   // GET PROPERTY DETAILS
  const properties = await mongoose.connection
    .collection("propertyDetails")
    .find()
    .toArray();

  const features = [];

  properties.forEach(d => {
    features.push({
      type: "Feature",
      geometry: d.geometry || d.location,
      properties: {
        type: "property",
        _id: d._id,
        ownerName: d.ownerName,
        // propertyDetails docs never had a `propertyNumber`/`propertyAddress`
        // field — they store newPropertyNo/oldPropertyNo and `address`.
        // Expose a consistent propertyNumber/propertyAddress pair so every
        // feature type can be searched/filtered the same way downstream.
        propertyNumber: d.newPropertyNo || d.oldPropertyNo || null,
        propertyAddress: d.address || null,
        newPropertyNo: d.newPropertyNo,
        oldPropertyNo: d.oldPropertyNo,
      }
    });
  });

  surveys.forEach(d => {
    features.push({
      type: "Feature",
      geometry: d.geometry || d.location,
      properties: {
        type: "survey",
        _id: d._id,
        ownerName: d.ownerName,
        propertyNumber: d.propertyNumber,
        propertyAddress: d.propertyAddress
      }
    });
  });

  appeals.forEach(d => {
  features.push({
    type: "Feature",
    geometry: d.geometry || d.location,
    properties: {
      type: "appeal",
      _id: d._id,
      ownerName: d.ownerName,
      propertyNumber: d.propertyNo || null,
      propertyNo: d.propertyNo,
    }
  });
});

  hearings.forEach(d => {
    features.push({
      type: "Feature",
      geometry: d.geometry || d.location,
      properties: {
        type: "hearing",
        _id: d._id,
        ownerName: d.ownerName,
        // hearingNotices never captured a property-number field at all
        // (see routes/hearingRoutes.js) — only address/ward/zone. Until a
        // propertyNo field is added to the Hearing Notice form, this stays
        // null, which is why any downstream search keyed on propertyNumber
        // could never exclude these markers.
        propertyNumber: d.propertyNo || null,
        propertyAddress: d.address || null,
      }
    });
  });

  notices.forEach(d => {
    features.push({
      type: "Feature",
      geometry: d.geometry || d.location,
      properties: {
        type: "notice119",
        _id: d._id,
        ownerName: d.ownerName,
        propertyNumber: d.newPropertyNo || d.oldPropertyNo || null,
        newPropertyNo: d.newPropertyNo,
        oldPropertyNo: d.oldPropertyNo,
      }
    });
  });

  namuna.forEach(d => {
    features.push({
      type: "Feature",
      geometry: d.geometry || d.location,
      properties: {
        type: "namuna43",
        _id: d._id,
        ownerName: d.ownerName,
        propertyNumber: d.propertyNo || null,
        propertyNo: d.propertyNo,
      }
    });
  });

  res.json({
    type: "FeatureCollection",
    features
  });
});


app.get('/api/3d/surveys/:id', async (req, res) => {
  try {
    const d = await SurveyEntry.findById(req.params.id).lean();
    if (!d) return res.status(404).json({ error: 'not found' });

    let geometry = d.geometry || null;
    if (!geometry && d.location && Array.isArray(d.location.coordinates)) {
      geometry = { type: 'Point', coordinates: d.location.coordinates };
    } else if (!geometry && Array.isArray(d.centroid)) {
      geometry = { type: 'Point', coordinates: [d.centroid[0], d.centroid[1]] };
    }

    const feature = {
      type: 'Feature',
      geometry,
      properties: {
        _id: d._id,
        propertyNumber: d.propertyNumber,
        propertyName: d.propertyName,
        ownerName: d.ownerName,
        usageOfProperty: d.usageOfProperty,
        propertyAddress: d.propertyAddress,
        style: d.style || { color: '#00BFFF', opacity: 0.5 },
        kmlUrl: d.kmlUrl || null,
        totalArea: d.totalArea,
        yearOfConstruction: d.yearOfConstruction,
        mobileNumber: d.mobileNumber,
        email: d.email
      }
    };

    res.json(feature);
  } catch (err) {
    console.error('GET /api/3d/surveys/:id error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

// ------------------ GET ROAD SURVEYS (FOR 3D PLATFORM) ------------------
app.get("/api/road-surveys", async (req, res) => {
  try {
    const roads = await RoadSurvey.find({}).lean();

    const features = roads.map(r => ({
      type: "Feature",
      geometry: r.geometry,
      properties: {
        _id: r._id,
        hasVideo: r.hasVideo,
        videoUrl: "http://13.127.220.89:8083/watch.html",
        centroid: r.centroid,
        createdFrom: r.createdFrom
      }
    }));

    res.json({
      type: "FeatureCollection",
      features
    });
  } catch (err) {
    console.error("GET /api/road-surveys error:", err);
    res.status(500).json({ message: "Failed to load road surveys" });
  }
});


// UPDATE polygon color by ID
app.put('/api/3d/surveys/:id/color', authMiddleware, async (req, res) => {

  try {
    const { color } = req.body; // new color hex (#FF0000)
    if (!color) return res.status(400).json({ message: "Color is required" });

    const updated = await SurveyEntry.findByIdAndUpdate(
      req.params.id,
      { $set: { "style.color": color } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Polygon not found" });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start server + init Redis and Socket.IO (minimal changes)
// ---------------------------------------------------------------------------

// load our modular infra (these files we created)
const { connectRedis } = require('./redis');   // small module to connect redis
const { initSocket } = require('./socket');     // socket.io + redis adapter

// 1) connect Redis (non-blocking; errors logged inside connectRedis)
connectRedis().catch(err => console.warn('Redis init error (caught):', err?.message || err));

// 2) start app and capture returned http.Server instance
//    NOTE: app.listen returns an instance of http.Server — we pass that to initSocket
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// 3) initialize socket.io using the http server
//    This attaches socket.io without otherwise changing the rest of your file.
try {
  const io = initSocket(server);
  // Optionally expose io to routes via app.locals so your routes can emit events:
  app.locals.io = io;
} catch (err) {
  console.warn('Socket init failed:', err?.message || err);
}
