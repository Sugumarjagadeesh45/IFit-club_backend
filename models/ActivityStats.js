const mongoose = require('mongoose');

const totalsSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  movingTime: { type: Number, default: 0 },
  elapsedTime: { type: Number, default: 0 },
  elevationGain: { type: Number, default: 0 },
  achievementCount: { type: Number, default: 0 }
}, { _id: false });

const activityStatsSchema = new mongoose.Schema({
  athleteId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  biggestRideDistance: { type: Number, default: 0 },
  biggestClimbElevationGain: { type: Number, default: 0 },
  recentRideTotals: totalsSchema,
  recentRunTotals: totalsSchema,
  recentSwimTotals: totalsSchema,
  ytdRideTotals: totalsSchema,
  ytdRunTotals: totalsSchema,
  ytdSwimTotals: totalsSchema,
  allRideTotals: totalsSchema,
  allRunTotals: totalsSchema,
  allSwimTotals: totalsSchema,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

activityStatsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ActivityStats', activityStatsSchema);
