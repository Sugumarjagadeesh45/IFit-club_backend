const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

const app = express();

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
const authRoutes = require('./routes/authRoutes');
const stravaRoutes = require('./routes/stravaRoutes');
const userRoutes = require('./routes/userRoutes');

// Log route registration
console.log('🔧 Registering routes...');
console.log('   /api/auth');
console.log('   /api/strava');
console.log('   /api/users');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/profile',
      'POST /api/strava/connect',
      'GET  /api/strava/user',
      'POST /api/strava/sync',
      'GET  /api/users/profile',
      'PUT  /api/users/profile',
      'GET  /api/health'
    ]
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🚴 Welcome to iFit Club API',
    version: '1.0.0',
    endpoints: '/api/health',
    documentation: 'All API endpoints require /api prefix'
  });
});

// Test all routes
app.get('/api/test', (req, res) => {
  res.json({
    routes: {
      auth: ['/register', '/login', '/profile'],
      strava: ['/connect', '/user', '/sync'],
      users: ['/profile']
    }
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
      'GET  /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/profile',
      'POST /api/strava/connect',
      'GET  /api/strava/user',
      'POST /api/strava/sync',
      'GET  /api/users/profile',
      'PUT  /api/users/profile'
    ]
  });
});

module.exports = app;