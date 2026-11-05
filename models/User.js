const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: String, // optional later for OAuth-only accounts
    googleId: String,
    role: { type: String, enum: ['user', 'moderator', 'admin', 'super-admin'], default: 'user' },
    isBlocked: { type: Boolean, default: false },
    preferredLanguage: { type: String, enum: ['en', 'ml'], default: 'en' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
