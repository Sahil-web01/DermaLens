import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`[DermaLens Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[DermaLens Server] Health endpoint: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('\n[DermaLens Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[DermaLens Server] Closed remaining connections.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
