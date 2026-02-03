const StravaService = require('../services/stravaService');
const User = require('../models/User');
const Activity = require('../models/Activity');

exports.connectStrava = async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    // Check if user exists
    let user = await User.findOne({ stravaId: athlete.id });

    if (!user) {
      // Create new user
      user = new User({
        stravaId: athlete.id,
        username: athlete.username || `${athlete.firstname.toLowerCase()}${athlete.lastname.toLowerCase()}`,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        profile: {
          city: athlete.city,
          state: athlete.state,
          country: athlete.country,
          weight: athlete.weight
        },
        stravaData: {
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiresAt: new Date(expires_at * 1000),
          athleteData: athlete
        }
      });
    } else {
      // Update existing user tokens
      user.stravaData.accessToken = access_token;
      user.stravaData.refreshToken = refresh_token;
      user.stravaData.tokenExpiresAt = new Date(expires_at * 1000);
      user.stravaData.athleteData = athlete;
    }

    await user.save();

    // Fetch and save recent activities
    await fetchAndSaveUserActivities(user);

    res.status(200).json({
      success: true,
      message: 'Strava connected successfully',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserData = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('activities')
      .select('-stravaData.accessToken -stravaData.refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.syncActivities = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updated = await fetchAndSaveUserActivities(user);
    
    res.status(200).json({
      success: true,
      message: `Synced ${updated} new activities`,
      activitiesCount: user.activities.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to fetch and save activities
async function fetchAndSaveUserActivities(user) {
  let updated = 0;
  
  try {
    const stravaService = new StravaService();
    const activities = await stravaService.getAthleteActivities(user.stravaData.accessToken);

    for (const activityData of activities) {
      // Check if activity already exists
      const existingActivity = await Activity.findOne({ stravaId: activityData.id });
      
      if (!existingActivity) {
        const activity = new Activity({
          stravaId: activityData.id,
          userId: user._id,
          name: activityData.name,
          type: activityData.type,
          distance: activityData.distance,
          movingTime: activityData.moving_time,
          elapsedTime: activityData.elapsed_time,
          totalElevationGain: activityData.total_elevation_gain,
          startDate: new Date(activityData.start_date),
          startDateLocal: new Date(activityData.start_date_local),
          timezone: activityData.timezone,
          averageSpeed: activityData.average_speed,
          maxSpeed: activityData.max_speed,
          averageHeartrate: activityData.average_heartrate,
          maxHeartrate: activityData.max_heartrate,
          calories: activityData.calories,
          description: activityData.description,
          locationCity: activityData.location_city,
          locationState: activityData.location_state,
          locationCountry: activityData.location_country,
          gearId: activityData.gear_id,
          rawData: activityData
        });

        await activity.save();
        user.activities.push(activity._id);
        updated++;
      }
    }

    // Update user stats
    user.stats.totalActivities = user.activities.length;
    user.stats.totalDistance = activities.reduce((sum, act) => sum + (act.distance || 0), 0);
    user.stats.totalElevation = activities.reduce((sum, act) => sum + (act.total_elevation_gain || 0), 0);
    user.stats.totalTime = activities.reduce((sum, act) => sum + (act.moving_time || 0), 0);

    await user.save();
    return updated;
  } catch (error) {
    throw error;
  }
}