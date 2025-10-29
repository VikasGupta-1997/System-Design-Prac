import mongoose from 'mongoose';
import config from '../config';


export const connectMongo = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Mongo connection error:', err);
    process.exit(1);
  }
};