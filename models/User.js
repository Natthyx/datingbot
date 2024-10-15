import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: String, required: true },
  gender: { type: String, required: true },
  bio: { type: String, required: true },
  classYear: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  preferences: { type: String, required: true }, // Store preference as a single string
  contact: { type: String, required: true }, // Contact info from Telegram
  // likes: [{ type: String }], // Store the IDs of liked profiles
  // likedBy: [{ type: String }], // Store the IDs of users who liked this profile
});

export default mongoose.model('User', userSchema);
