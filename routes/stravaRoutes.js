const express = require('express');
const router = express.Router();
const stravaController = require('../controllers/stravaController');

// =====================================================
// AUTHENTICATION ROUTES (No auth required)
// =====================================================

// GET /auth/strava/debug - Debug configuration (for troubleshooting)
router.get('/auth/strava/debug', stravaController.debugConfig);

// GET /auth/strava - Redirect to Strava authorization
router.get('/auth/strava', stravaController.redirectToStrava);

// GET /auth/strava/callback - Handle OAuth callback
router.get('/auth/strava/callback', stravaController.handleCallback);

// =====================================================
// ATHLETE DATA ROUTES
// =====================================================

// GET /athlete/:athleteId/profile - Get athlete profile
router.get('/athlete/:athleteId/profile', stravaController.getAthleteProfile);

// GET /athlete/:athleteId/activities - Get all activities
router.get('/athlete/:athleteId/activities', stravaController.getAthleteActivities);

// GET /athlete/:athleteId/stats - Get activity statistics
router.get('/athlete/:athleteId/stats', stravaController.getAthleteStats);

// POST /athlete/:athleteId/sync - Sync latest data from Strava
router.post('/athlete/:athleteId/sync', stravaController.syncAthleteData);

// GET /athlete/:athleteId/sync-history - Get sync history
router.get('/athlete/:athleteId/sync-history', stravaController.getSyncHistory);

// DELETE /athlete/:athleteId/disconnect - Disconnect Strava
router.delete('/athlete/:athleteId/disconnect', stravaController.disconnectStrava);

module.exports = router;
