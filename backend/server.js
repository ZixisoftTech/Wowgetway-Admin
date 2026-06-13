import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dashboardRouter from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wow_gateways';

// Allow CORS from typical local frontend ports
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Setup api routes
app.use('/api/dashboard', dashboardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected/fallback_mode',
    uptime: process.uptime()
  });
});

// Connect to database asynchronously so that the app still boots if local MongoDB is down
console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 3000 // Timeout fast so we can run on fallback
})
.then(() => {
  console.log('Success: Connected to MongoDB.');
})
.catch((err) => {
  console.warn('Warning: Could not connect to MongoDB. Server is starting in MEMORY FALLBACK mode.', err.message);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`===================================================`);
});
