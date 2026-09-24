import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';

import uploadRoutes from './routes/uploadRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import clinicianRoutes from './routes/clinicianRoutes.js';
import checkinRoutes from './routes/checkinRoutes.js';
import authRoutes from './routes/authRoutes.js';
import episodeRoutes from './routes/episodeRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Allowed origins for CORS (Next.js frontend dev server)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching frontend
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Clinician-Email', 'X-User-Email'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded wound photos statically
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use(`/${uploadDir}`, express.static(path.resolve(uploadDir)));

// Basic info & health routes
app.get('/', (req, res) => {
  res.json({
    name: 'DermaLens AI API',
    status: 'online',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/clinician', clinicianRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size must be under 10MB' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

export default app;
