require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const User = require('./models/User');
const AppPermission = require('./models/AppPermission');
const AuthorizationCode = require('./models/AuthorizationCode');

const app = express();
const PORT = process.env.PORT || 4100;
const isProduction = process.env.NODE_ENV === 'production';

const CONFIGURED_MONGO_URI =
  process.env.MASTER_MONGO_URI || 'mongodb://127.0.0.1:27017/gis-master-auth';
const SESSION_SECRET = process.env.MASTER_SESSION_SECRET;

if (isProduction && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
  console.error('FATAL: MASTER_SESSION_SECRET must be set to a strong random value in production.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Resolve which Mongo URI to actually use.
//
// In development, people often don't have a local `mongod` running, which
// used to make BOTH mongoose's connection AND the express-session MongoStore
// fail — the MongoStore failure in particular surfaced as a generic
// "Internal server error." on every request (register/login included),
// because the session middleware runs before the route handler and calls
// next(err) when the store can't reach Mongo.
//
// Fix: in development, first try the configured/real URI with a short
// timeout. If it's unreachable, transparently spin up an in-memory MongoDB
// (mongodb-memory-server) instead, so `npm run dev` just works out of the
// box without needing a second terminal running Mongo manually.
// In production this fallback never runs — a real MASTER_MONGO_URI is
// required, same as before.
// ---------------------------------------------------------------------------
async function resolveMongoUri() {
  if (isProduction) return CONFIGURED_MONGO_URI;

  try {
    await mongoose.createConnection(CONFIGURED_MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    }).asPromise();
    return CONFIGURED_MONGO_URI;
  } catch (err) {
    console.warn(
      `[dev] Could not reach MongoDB at ${CONFIGURED_MONGO_URI} (${err.message}).`
    );
    console.warn('[dev] Falling back to an in-memory MongoDB for local development...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memoryUri = mongod.getUri('gis-master-auth');
    process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
    process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
    console.log(`[dev] In-memory MongoDB ready at ${memoryUri}`);
    return memoryUri;
  }
}

async function main() {
  const MONGO_URI = await resolveMongoUri();

  // Trust Render's reverse proxy so `secure` cookies work correctly.
  app.set('trust proxy', 1);

  const rawOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
  const allowedOrigins = new Set(
    [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:3006',
      'http://localhost:3007',
      'http://localhost:4000',
      'http://localhost:4100',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      ...rawOrigins
    ].map((s) => s.trim().replace(/\/+$/, ''))
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.trim().replace(/\/+$/, '');
        if (allowedOrigins.has(cleanOrigin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin) || !isProduction) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(
    session({
      name: 'master.sid',
      secret: SESSION_SECRET || 'dev-only-insecure-secret-change-me',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: MONGO_URI, collectionName: 'master_sessions' }),
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax', // same-origin usage only: browser <-> Main app backend
        maxAge: 1000 * 60 * 60 * 8, // 8 hours
      },
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  // Serve the React build from the same origin as this API, so the master
  // session cookie can stay SameSite=Lax (first-party) instead of needing
  // SameSite=None + a separately-hosted frontend origin.
  if (isProduction) {
    const buildPath = path.join(__dirname, '../build');
    app.use(express.static(buildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(buildPath, 'index.html'));
    });
  }

  app.use((err, req, res, next) => {
    console.error('[unhandled]', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  });

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Master Auth Server connected to MongoDB.');

    // Reconcile indexes with the current schemas. This matters most for
    // AppPermission: it used to be keyed by a unique {userId, appId} pair;
    // it's now keyed by {userId, moduleId}. If a database already has the
    // old index from a previous deploy, Mongo keeps enforcing it even
    // though the schema no longer has an `appId` field — every document
    // written by grantAllModules() would then collide on the old index's
    // implicit {userId, appId: null} key and fail with a duplicate-key
    // error (this is what surfaces to the user as a generic "Registration
    // failed" / "Could not create the user" message). syncIndexes() drops
    // indexes that no longer match the schema and (re)creates the correct
    // ones, so this self-heals on every deploy instead of needing a manual
    // fix in Compass/mongosh.
    try {
      await Promise.all([
        User.syncIndexes(),
        AppPermission.syncIndexes(),
        AuthorizationCode.syncIndexes(),
      ]);
      console.log('MongoDB indexes are in sync with current schemas.');
    } catch (indexErr) {
      console.warn('[startup] Could not sync indexes (continuing anyway):', indexErr.message);
    }

    app.listen(PORT, () => console.log(`Master Auth Server listening on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

main();
