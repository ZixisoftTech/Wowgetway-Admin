import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import dashboardRouter from './routes.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways_local';

const allowedOrigins = [
  "https://frontend-chi-three-zbs3ijk1gi.vercel.app",
  "https://wow-getway.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

// Allow CORS dynamically reflecting the incoming request's origin against a strict whitelist
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^http:\/\/localhost:\d+$/.test(origin) ||
                      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
                      /\.netlify\.app$/.test(origin) ||
                      /\.vercel\.app$/.test(origin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Apply security headers (allow cross-origin resources for image loading)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Prevent NoSQL query injection
app.use(mongoSanitize());

// Parse cookies securely
app.use(cookieParser());

// Standard JSON and URL-encoded body limit to prevent DOS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure database connection is active with cached promise (prevents Serverless cold-start race conditions)
let cachedDbPromise = null;
let indexesSynced = false;

const syncDatabaseIndexes = async () => {
  if (indexesSynced) return;
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const propColl = db.collection('properties');
    const indexes = await propColl.indexes();
    const legacyIndex = indexes.find(idx => idx.name === 'ownerId_1_name_1');

    if (legacyIndex && (!legacyIndex.partialFilterExpression || !legacyIndex.partialFilterExpression.name)) {
      console.log('[Migration] Dropping legacy unique index ownerId_1_name_1 on properties collection...');
      await propColl.dropIndex('ownerId_1_name_1');
      console.log('[Migration] Legacy index dropped successfully.');
    }

    await propColl.createIndex(
      { ownerId: 1, name: 1 },
      {
        name: 'ownerId_1_name_1',
        unique: true,
        background: true,
        partialFilterExpression: {
          name: { $gt: '' },
          deleted: false
        }
      }
    );
    indexesSynced = true;
    console.log('[Migration] Partial unique index ownerId_1_name_1 verified successfully.');
  } catch (err) {
    console.error('[Migration] Index sync note:', err.message);
  }
};

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    if (!indexesSynced) {
      syncDatabaseIndexes().catch(() => {});
    }
    return mongoose.connection;
  }
  if (!cachedDbPromise) {
    console.log('[Database Middleware] Establishing connection to MongoDB...');
    cachedDbPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      bufferCommands: false,
      maxPoolSize: 10,
    }).then(async (m) => {
      console.log('[Database Middleware] Connection established successfully!');
      await syncDatabaseIndexes();
      return m;
    }).catch((err) => {
      console.error('[Database Middleware] Connection error:', err.message);
      cachedDbPromise = null;
      throw err;
    });
  }
  return cachedDbPromise;
};

app.use(async (req, res, next) => {
  if (req.path === '/health') return next();

  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('[Database Middleware] Connection failed:', err.message);
    return res.status(503).json({
      error: 'DatabaseConnectionError',
      message: 'Could not establish connection to live MongoDB. Please try again.'
    });
  }
});

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve uploaded files statically
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
app.use('/uploads', express.static(uploadDir));

// Setup api routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api', dashboardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected/fallback_mode',
    readyState: mongoose.connection.readyState,
    uptime: process.uptime()
  });
});


// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({ 
    error: err.name || 'InternalServerError', 
    message: isProd ? 'An unexpected error occurred on the server.' : err.message 
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('===================================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('===================================================');
  });
}

export default app;
