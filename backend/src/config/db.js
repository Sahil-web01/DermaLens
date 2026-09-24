import mongoose from 'mongoose';

// Connect to MongoDB database with auto-fallback
const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/dermalens';

  // 1. Try primary URI (e.g. MongoDB Atlas) if specified
  if (primaryUri && primaryUri !== fallbackUri) {
    try {
      console.log('Connecting to primary MongoDB URI...');
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(`MongoDB Atlas connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`[MongoDB Warning] Primary connection failed: ${error.message}`);
      console.warn('Switching to local MongoDB fallback on mongodb://127.0.0.1:27017/dermalens...');
    }
  }

  // 2. Fallback to local MongoDB
  try {
    const conn = await mongoose.connect(fallbackUri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`Local MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('All database connection attempts failed:', error.message);
  }
};

export default connectDB;
