import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Start the server
const server = app.listen(PORT, () => {
  console.log(`DermaLens server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Clean shutdown on Ctrl+C
process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server shut down cleanly');
    process.exit(0);
  });
});
