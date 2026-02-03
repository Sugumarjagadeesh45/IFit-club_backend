const app = require('./app');
const connectDB = require('./config/database');

require('dotenv').config();

const PORT = process.env.PORT || 5001;

console.log('🚀 Starting iFit Club Backend...');
console.log('📁 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', PORT);

// Connect to MongoDB
connectDB();

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n✅ Server is running on port ${PORT}`);
  console.log('👉 Local:   http://localhost:' + PORT);
  console.log('👉 Health:  http://localhost:' + PORT + '/api/health');
  console.log('👉 Test:    http://localhost:' + PORT + '/api/test');
  console.log('\n📋 Available Endpoints:');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/auth/profile');
  console.log('   POST /api/strava/connect');
  console.log('   GET  /api/strava/user');
  console.log('   GET  /api/users/profile');
  console.log('\n💡 Tip: Use Thunder Client or Postman to test endpoints');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use`);
    console.log('💡 Try: kill -9 $(lsof -ti:5001)');
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});