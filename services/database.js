import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoUrl = 'mongodb+srv://admin:CxPV38YWji5FIviA@aastucupid.6kb4s.mongodb.net/?retryWrites=true&w=majority&appName=aastucupid';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;
