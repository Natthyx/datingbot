import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  gender: { type: String, required: true },
  bio: { type: String, required: true },
  batchYear: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  contact: { type: String, required: true }, // Contact info from Telegram
  // likes: [{ type: String }], // Store the IDs of liked profiles
  // likedBy: [{ type: String }], // Store the IDs of users who liked this profile
});

export default mongoose.model('User', userSchema);
