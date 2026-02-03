const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', limiter);

// Import routes
const stravaRoutes = require('./routes/stravaRoutes');

// Log route registration
console.log('🔧 Registering routes...');
console.log('   GET  /api/auth/strava');
console.log('   GET  /api/auth/strava/callback');
console.log('   GET  /api/athlete/:athleteId/profile');
console.log('   GET  /api/athlete/:athleteId/activities');
console.log('   GET  /api/athlete/:athleteId/stats');

// Routes - Mount strava routes at /api root
app.use('/api', stravaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'iFit Club Backend is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  /api/auth/strava                    - Redirect to Strava OAuth',
      'GET  /api/auth/strava/callback           - OAuth callback handler',
      'GET  /api/athlete/:athleteId/profile     - Get athlete profile',
      'GET  /api/athlete/:athleteId/activities  - Get all activities',
      'GET  /api/athlete/:athleteId/stats       - Get activity statistics',
      'POST /api/athlete/:athleteId/sync        - Sync latest data',
      'GET  /api/athlete/:athleteId/sync-history - Get sync history',
      'DELETE /api/athlete/:athleteId/disconnect - Disconnect Strava'
    ]
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🚴 Welcome to iFit Club API',
    version: '1.0.0',
    documentation: 'Strava-only authentication. Click "Connect with Strava" to begin.',
    authEndpoint: '/api/auth/strava',
    healthCheck: '/api/health'
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET  /',
      'GET  /api/health',
      'GET  /api/auth/strava',
      'GET  /api/auth/strava/callback',
      'GET  /api/athlete/:athleteId/profile',
      'GET  /api/athlete/:athleteId/activities',
      'GET  /api/athlete/:athleteId/stats',
      'POST /api/athlete/:athleteId/sync',
      'GET  /api/athlete/:athleteId/sync-history',
      'DELETE /api/athlete/:athleteId/disconnect'
    ]
  });
});

module.exports = app;
