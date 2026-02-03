const express = require('express');
const router = express.Router();

// POST /api/strava/connect
router.post('/connect', (req, res) => {
  const { code } = req.body;
  
  // Simulate Strava OAuth flow
  res.status(200).json({
    success: true,
    message: 'Strava connected successfully',
    data: {
      userId: 'strava-integrated-user-' + Date.now(),
      stravaAthleteId: Math.floor(Math.random() * 1000000),
      accessToken: 'strava-access-token-' + Date.now(),
      refreshToken: 'strava-refresh-token-' + Date.now(),
      expiresAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      athlete: {
        id: 123456,
        username: 'strava_user',
        firstname: 'Strava',
        lastname: 'User',
        city: 'Chennai',
        country: 'India',
        weight: 75.5
      }
    }
  });
});

// GET /api/strava/user
router.get('/user', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Strava user data fetched',
    user: {
      id: 'strava-user-123',
      stravaId: 123456,
      firstName: 'Strava',
      lastName: 'Athlete',
      profile: {
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        profile_medium: 'https://example.com/profile.jpg',
        profile: 'https://example.com/profile_large.jpg'
      },
      stats: {
        recentActivities: [
          { id: 1, name: 'Morning Run', type: 'Run', distance: 5.2, duration: '30:00' },
          { id: 2, name: 'Evening Cycle', type: 'Ride', distance: 25.5, duration: '1:15:00' }
        ],
        total: {
          activities: 156,
          distance: 1250.75,
          elevation: 8500,
          time: 45000
        }
      }
    }
  });
});

// POST /api/strava/sync
router.post('/sync', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Activities synced successfully',
    synced: {
      count: 15,
      activities: [
        { id: 1, name: 'Morning Run', distance: 5.2, type: 'Run' },
        { id: 2, name: 'Evening Ride', distance: 25.5, type: 'Ride' }
      ],
      summary: {
        totalActivities: 156,
        totalDistance: 1250.75,
        totalTime: '12h 30m'
      }
    }
  });
});

module.exports = router;