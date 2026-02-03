const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  stravaId: {
    type: Number,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: String,
  type: String,
  distance: Number,
  movingTime: Number,
  elapsedTime: Number,
  totalElevationGain: Number,
  startDate: Date,
  startDateLocal: Date,
  timezone: String,
  averageSpeed: Number,
  maxSpeed: Number,
  averageHeartrate: Number,
  maxHeartrate: Number,
  calories: Number,
  description: String,
  locationCity: String,
  locationState: String,
  locationCountry: String,
  gearId: String,
  splitsMetric: Array,
  laps: Array,
  rawData: Object,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Activity', activitySchema);