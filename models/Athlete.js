const mongoose = require('mongoose');

const athleteSchema = new mongoose.Schema({
  stravaId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  username: String,
  firstName: String,
  lastName: String,
  profileMedium: String,
  profile: String,
  city: String,
  state: String,
  country: String,
  gender: String,
  weight: Number,
  followerCount: { type: Number, default: 0 },
  friendCount: { type: Number, default: 0 },
  premium: { type: Boolean, default: false },
  summit: { type: Boolean, default: false },
  stravaCreatedAt: Date,
  stravaUpdatedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

athleteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Athlete', athleteSchema);
