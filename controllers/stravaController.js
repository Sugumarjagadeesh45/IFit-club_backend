const stravaService = require('../services/stravaService');
const Athlete = require('../models/Athlete');
const OAuthToken = require('../models/OAuthToken');
const Activity = require('../models/Activity');
const ActivityStats = require('../models/ActivityStats');
const SyncLog = require('../models/SyncLog');
const { generateToken } = require('../utils/jwtUtils');

// Helper: Generate HTML for deep link redirection (Fix for Android Chrome)
const getRedirectHtml = (deepLink) => `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .loader { border: 3px solid #e0e0e0; border-top: 3px solid #fc4c02; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    p { color: #666; margin-bottom: 20px; }
    .btn { padding: 10px 20px; background: #fc4c02; color: white; text-decoration: none; border-radius: 5px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <p>Redirecting to iFit Club...</p>
  <a href="${deepLink}" class="btn">Click here if not redirected</a>
  <script>
    setTimeout(() => { window.location.href = "${deepLink}"; }, 500);
  </script>
</body>
</html>
`;

// Debug: Show Strava config (for troubleshooting)
exports.debugConfig = (req, res) => {
  const authUrl = stravaService.getAuthorizationUrl();
  res.json({
    success: true,
    message: 'Strava OAuth Configuration',
    config: {
      clientId: process.env.STRAVA_CLIENT_ID,
      redirectUri: process.env.STRAVA_REDIRECT_URI,
      frontendUrl: process.env.FRONTEND_URL,
      authorizationUrl: authUrl
    },
    instructions: {
      step1: 'Click the authorizationUrl to start OAuth',
      step2: 'Authorize on Strava',
      step3: 'Strava redirects to callback with code',
      step4: 'Backend exchanges code for token',
      step5: 'Backend redirects to FRONTEND_URL with token'
    }
  });
};

// Redirect to Strava OAuth
exports.redirectToStrava = (req, res) => {
  const authUrl = stravaService.getAuthorizationUrl();
  console.log('🔗 Redirecting to Strava:', authUrl);
  res.redirect(authUrl);
};

// Handle Strava OAuth callback - FAST redirect, background sync
exports.handleCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      console.error('Strava auth error:', error);
      return res.send(getRedirectHtml(`ifitclub://auth-error?message=${encodeURIComponent('Strava authorization denied: ' + error)}`));
    }

    if (!code) {
      return res.send(getRedirectHtml(`ifitclub://auth-error?message=${encodeURIComponent('Authorization code not provided')}`));
    }

    console.log('🔄 Exchanging code for tokens...');

    // Exchange code for tokens
    const tokenData = await stravaService.exchangeCodeForTokens(code);
    const { accessToken, refreshToken, expiresAt, athlete } = tokenData;

    console.log('✅ Token received for athlete:', athlete.id);

    // Save or update athlete (FAST - just profile data from token response)
    await Athlete.findOneAndUpdate(
      { stravaId: athlete.id },
      {
        stravaId: athlete.id,
        username: athlete.username,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        profileMedium: athlete.profile_medium,
        profile: athlete.profile,
        city: athlete.city,
        state: athlete.state,
        country: athlete.country,
        gender: athlete.sex,
        weight: athlete.weight,
        followerCount: athlete.follower_count,
        friendCount: athlete.friend_count,
        premium: athlete.premium,
        summit: athlete.summit,
        stravaCreatedAt: athlete.created_at ? new Date(athlete.created_at) : null,
        stravaUpdatedAt: athlete.updated_at ? new Date(athlete.updated_at) : null
      },
      { upsert: true, new: true }
    );

    console.log('✅ Athlete saved');

    // Save or update OAuth token (FAST)
    await OAuthToken.findOneAndUpdate(
      { athleteId: athlete.id },
      {
        athleteId: athlete.id,
        accessToken,
        refreshToken,
        expiresAt
      },
      { upsert: true, new: true }
    );

    console.log('✅ OAuth tokens saved');

    // Generate JWT token for the athlete
    const jwtToken = generateToken(athlete.id);

    console.log('✅ JWT generated');
    console.log('🔗 Redirecting to mobile app IMMEDIATELY...');

    // REDIRECT IMMEDIATELY - Don't wait for activities sync!
    const deepLinkUrl = `ifitclub://auth-success?athleteId=${athlete.id}&token=${jwtToken}&firstName=${encodeURIComponent(athlete.firstname || '')}&lastName=${encodeURIComponent(athlete.lastname || '')}&profile=${encodeURIComponent(athlete.profile || '')}`;

    // Send redirect response FIRST
    res.send(getRedirectHtml(deepLinkUrl));

    // THEN sync activities in background (non-blocking)
    console.log('🔄 Starting background sync for activities and stats...');
    syncActivitiesInBackground(athlete.id, accessToken).catch(err => {
      console.error('❌ Background sync error:', err.message);
    });

  } catch (error) {
    console.error('❌ Strava callback error:', error);
    const errorDeepLink = `ifitclub://auth-error?message=${encodeURIComponent(error.message)}`;
    res.send(getRedirectHtml(errorDeepLink));
  }
};

// Background sync function (runs after redirect)
async function syncActivitiesInBackground(athleteId, accessToken) {
  const syncLog = new SyncLog({
    athleteId: athleteId,
    syncType: 'full',
    status: 'started'
  });
  await syncLog.save();

  try {
    console.log('📊 Fetching stats for athlete:', athleteId);

    // Fetch and save athlete stats
    const statsData = await stravaService.getAthleteStats(accessToken, athleteId);
    await saveAthleteStats(athleteId, statsData);
    console.log('✅ Stats saved');

    // Fetch and save all activities
    console.log('📥 Fetching activities (this may take a while)...');
    const activitiesResult = await fetchAndSaveAllActivities(athleteId, accessToken);

    // Update sync log
    syncLog.status = 'completed';
    syncLog.activitiesSynced = activitiesResult.total;
    syncLog.newActivities = activitiesResult.new;
    syncLog.updatedActivities = activitiesResult.updated;
    syncLog.completedAt = new Date();
    await syncLog.save();

    console.log('✅ Background sync complete!');
    console.log('📊 Total activities synced:', activitiesResult.total);
    console.log('🆕 New:', activitiesResult.new);
    console.log('🔄 Updated:', activitiesResult.updated);

  } catch (syncError) {
    console.error('❌ Background sync failed:', syncError.message);
    syncLog.status = 'failed';
    syncLog.errorMessage = syncError.message;
    syncLog.completedAt = new Date();
    await syncLog.save();
  }
}

// Get athlete profile
exports.getAthleteProfile = async (req, res) => {
  try {
    const { athleteId } = req.params;

    const athlete = await Athlete.findOne({ stravaId: parseInt(athleteId) });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: 'Athlete not found'
      });
    }

    res.status(200).json({
      success: true,
      data: athlete
    });
  } catch (error) {
    console.error('Get athlete profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get athlete activities
exports.getAthleteActivities = async (req, res) => {
  try {
    const { athleteId } = req.params;
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;

    const query = { athleteId: parseInt(athleteId) };

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .sort({ startDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get athlete activities error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get athlete stats
exports.getAthleteStats = async (req, res) => {
  try {
    const { athleteId } = req.params;

    const stats = await ActivityStats.findOne({ athleteId: parseInt(athleteId) });

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Stats not found'
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get athlete stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Sync athlete data (refresh)
exports.syncAthleteData = async (req, res) => {
  try {
    const { athleteId } = req.params;

    // Get valid access token
    const accessToken = await getValidAccessToken(parseInt(athleteId));

    // Create sync log
    const syncLog = new SyncLog({
      athleteId: parseInt(athleteId),
      syncType: 'incremental',
      status: 'started'
    });
    await syncLog.save();

    try {
      // Refresh athlete profile
      const athleteData = await stravaService.getAthlete(accessToken);
      await Athlete.findOneAndUpdate(
        { stravaId: parseInt(athleteId) },
        {
          username: athleteData.username,
          firstName: athleteData.firstname,
          lastName: athleteData.lastname,
          profileMedium: athleteData.profile_medium,
          profile: athleteData.profile,
          city: athleteData.city,
          state: athleteData.state,
          country: athleteData.country,
          gender: athleteData.sex,
          weight: athleteData.weight,
          followerCount: athleteData.follower_count,
          friendCount: athleteData.friend_count,
          premium: athleteData.premium,
          summit: athleteData.summit
        }
      );

      // Refresh stats
      const statsData = await stravaService.getAthleteStats(accessToken, athleteId);
      await saveAthleteStats(parseInt(athleteId), statsData);

      // Fetch new activities
      const activitiesResult = await fetchAndSaveAllActivities(parseInt(athleteId), accessToken);

      // Update sync log
      syncLog.status = 'completed';
      syncLog.activitiesSynced = activitiesResult.total;
      syncLog.newActivities = activitiesResult.new;
      syncLog.updatedActivities = activitiesResult.updated;
      syncLog.completedAt = new Date();
      await syncLog.save();

      res.status(200).json({
        success: true,
        message: 'Data synced successfully',
        data: {
          newActivities: activitiesResult.new,
          updatedActivities: activitiesResult.updated,
          totalActivities: activitiesResult.total
        }
      });
    } catch (syncError) {
      syncLog.status = 'failed';
      syncLog.errorMessage = syncError.message;
      syncLog.completedAt = new Date();
      await syncLog.save();
      throw syncError;
    }

  } catch (error) {
    console.error('Sync athlete data error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get sync history
exports.getSyncHistory = async (req, res) => {
  try {
    const { athleteId } = req.params;
    const { limit = 10 } = req.query;

    const syncLogs = await SyncLog.find({ athleteId: parseInt(athleteId) })
      .sort({ startedAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: syncLogs
    });
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Disconnect Strava
exports.disconnectStrava = async (req, res) => {
  try {
    const { athleteId } = req.params;

    const tokenDoc = await OAuthToken.findOne({ athleteId: parseInt(athleteId) });

    if (tokenDoc) {
      // Deauthorize with Strava
      try {
        await stravaService.deauthorize(tokenDoc.accessToken);
      } catch (e) {
        console.error('Deauthorization with Strava failed:', e.message);
      }

      // Delete all data
      await Promise.all([
        Athlete.deleteOne({ stravaId: parseInt(athleteId) }),
        OAuthToken.deleteOne({ athleteId: parseInt(athleteId) }),
        Activity.deleteMany({ athleteId: parseInt(athleteId) }),
        ActivityStats.deleteOne({ athleteId: parseInt(athleteId) }),
        SyncLog.deleteMany({ athleteId: parseInt(athleteId) })
      ]);
    }

    res.status(200).json({
      success: true,
      message: 'Strava disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect Strava error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper: Get valid access token (refresh if expired)
async function getValidAccessToken(athleteId) {
  const tokenDoc = await OAuthToken.findOne({ athleteId });

  if (!tokenDoc) {
    throw new Error('Token not found. Please reconnect with Strava.');
  }

  // Check if token is expired
  if (tokenDoc.isExpired()) {
    const newTokens = await stravaService.refreshAccessToken(tokenDoc.refreshToken);

    tokenDoc.accessToken = newTokens.accessToken;
    tokenDoc.refreshToken = newTokens.refreshToken;
    tokenDoc.expiresAt = newTokens.expiresAt;
    await tokenDoc.save();

    return newTokens.accessToken;
  }

  return tokenDoc.accessToken;
}

// Helper: Save athlete stats
async function saveAthleteStats(athleteId, statsData) {
  const formatTotals = (data) => ({
    count: data?.count || 0,
    distance: data?.distance || 0,
    movingTime: data?.moving_time || 0,
    elapsedTime: data?.elapsed_time || 0,
    elevationGain: data?.elevation_gain || 0,
    achievementCount: data?.achievement_count || 0
  });

  await ActivityStats.findOneAndUpdate(
    { athleteId },
    {
      athleteId,
      biggestRideDistance: statsData.biggest_ride_distance || 0,
      biggestClimbElevationGain: statsData.biggest_climb_elevation_gain || 0,
      recentRideTotals: formatTotals(statsData.recent_ride_totals),
      recentRunTotals: formatTotals(statsData.recent_run_totals),
      recentSwimTotals: formatTotals(statsData.recent_swim_totals),
      ytdRideTotals: formatTotals(statsData.ytd_ride_totals),
      ytdRunTotals: formatTotals(statsData.ytd_run_totals),
      ytdSwimTotals: formatTotals(statsData.ytd_swim_totals),
      allRideTotals: formatTotals(statsData.all_ride_totals),
      allRunTotals: formatTotals(statsData.all_run_totals),
      allSwimTotals: formatTotals(statsData.all_swim_totals)
    },
    { upsert: true, new: true }
  );
}

// Helper: Fetch and save all activities
async function fetchAndSaveAllActivities(athleteId, accessToken) {
  const activities = await stravaService.getAllActivities(accessToken);

  let newCount = 0;
  let updatedCount = 0;

  for (const activityData of activities) {
    const existingActivity = await Activity.findOne({ stravaActivityId: activityData.id });

    const activityDoc = {
      athleteId,
      stravaActivityId: activityData.id,
      name: activityData.name,
      type: activityData.type,
      sportType: activityData.sport_type,
      distance: activityData.distance || 0,
      movingTime: activityData.moving_time || 0,
      elapsedTime: activityData.elapsed_time || 0,
      totalElevationGain: activityData.total_elevation_gain || 0,
      startDate: new Date(activityData.start_date),
      startDateLocal: new Date(activityData.start_date_local),
      timezone: activityData.timezone,
      utcOffset: activityData.utc_offset,
      startLatLng: activityData.start_latlng,
      endLatLng: activityData.end_latlng,
      achievementCount: activityData.achievement_count || 0,
      kudosCount: activityData.kudos_count || 0,
      commentCount: activityData.comment_count || 0,
      athleteCount: activityData.athlete_count || 1,
      photoCount: activityData.photo_count || 0,
      trainer: activityData.trainer || false,
      commute: activityData.commute || false,
      manual: activityData.manual || false,
      private: activityData.private || false,
      flagged: activityData.flagged || false,
      workoutType: activityData.workout_type,
      averageSpeed: activityData.average_speed || 0,
      maxSpeed: activityData.max_speed || 0,
      averageCadence: activityData.average_cadence,
      averageHeartrate: activityData.average_heartrate,
      maxHeartrate: activityData.max_heartrate,
      averageWatts: activityData.average_watts,
      maxWatts: activityData.max_watts,
      weightedAverageWatts: activityData.weighted_average_watts,
      kilojoules: activityData.kilojoules,
      deviceWatts: activityData.device_watts,
      hasHeartrate: activityData.has_heartrate || false,
      calories: activityData.calories || 0,
      sufferScore: activityData.suffer_score,
      map: activityData.map ? {
        id: activityData.map.id,
        summaryPolyline: activityData.map.summary_polyline,
        resourceState: activityData.map.resource_state
      } : null,
      gearId: activityData.gear_id,
      deviceName: activityData.device_name
    };

    if (existingActivity) {
      await Activity.updateOne(
        { stravaActivityId: activityData.id },
        activityDoc
      );
      updatedCount++;
    } else {
      await Activity.create(activityDoc);
      newCount++;
    }
  }

  return {
    total: activities.length,
    new: newCount,
    updated: updatedCount
  };
}
