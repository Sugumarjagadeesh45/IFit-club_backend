const express = require('express');
const router = express.Router();

// GET user profile
router.get('/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User profile fetched successfully',
    user: {
      id: 'user-' + Date.now(),
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profile: {
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        weight: 70
      },
      stats: {
        totalActivities: 25,
        totalDistance: 350.5,
        totalElevation: 1250,
        totalTime: 25000
      }
    }
  });
});

// Update user profile
router.put('/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  });
});

module.exports = router;