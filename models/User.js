const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    sparse: true
  },
  stravaId: {
    type: Number,
    unique: true,
    sparse: true
  },
  username: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  password: String, // Only for local auth, not for Strava users
  profile: {
    city: String,
    state: String,
    country: String,
    weight: Number,
    profile_medium: String,
    profile: String
  },
  stravaData: {
    accessToken: String,
    refreshToken: String,
    tokenExpiresAt: Date,
    athleteData: Object
  },
  stats: {
    totalActivities: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalElevation: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 }
  },
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);