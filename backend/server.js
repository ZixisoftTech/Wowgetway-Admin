import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import dashboardRouter from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways';

// Apply security headers (allow cross-origin resources for image loading)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Prevent NoSQL query injection
app.use(mongoSanitize());

// Parse cookies securely
app.use(cookieParser());

// Allow CORS dynamically reflecting the incoming request's origin
app.use(cors({
  origin: true,
  credentials: true
}));

// Standard JSON and URL-encoded body limit to prevent DOS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure database connection is active (needed for Serverless restarts/standbys)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 2) {
    try {
      console.log('[Database Middleware] Connecting/Reconnecting to MongoDB Atlas...');
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
      console.log('[Database Middleware] Connection established successfully!');
    } catch (err) {
      console.warn('[Database Middleware] Connection failed:', err.message);
    }
  }
  next();
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
