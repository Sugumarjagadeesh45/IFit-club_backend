const app = require('./app');
const connectDB = require('./config/database');

require('dotenv').config();

const PORT = process.env.PORT || 5001;

console.log('🚀 Starting iFit Club Backend...');
console.log('📁 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', PORT);

let server;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    server = app.listen(PORT, () => {
      console.log(`\n✅ Server is running on port ${PORT}`);
      console.log('👉 Local:   http://localhost:' + PORT);
      console.log('👉 Health:  http://localhost:' + PORT + '/api/health');
      console.log('\n📋 Available Endpoints:');
      console.log('   GET  /api/auth/strava              - Connect with Strava');
      console.log('   GET  /api/auth/strava/callback     - OAuth callback');
      console.log('   GET  /api/athlete/:id/profile      - Get athlete profile');
      console.log('   GET  /api/athlete/:id/activities   - Get activities');
      console.log('   GET  /api/athlete/:id/stats        - Get statistics');
      console.log('   POST /api/athlete/:id/sync         - Sync data');
      console.log('\n💡 Frontend: Redirect users to /api/auth/strava to connect');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use`);
        console.log('💡 Try: kill -9 $(lsof -ti:5001)');
        process.exit(1);
      }
    });
  } catch (err) {
    console.log('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
