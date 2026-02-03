const axios = require('axios');
const stravaConfig = require('../config/strava');

class StravaService {
  constructor() {
    this.baseURL = stravaConfig.apiUrl;
    this.clientId = stravaConfig.clientId;
    this.clientSecret = stravaConfig.clientSecret;
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async getAthlete(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/athlete`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get athlete: ${error.message}`);
    }
  }

  async getAthleteActivities(accessToken, params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/athlete/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          per_page: 200,
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get activities: ${error.message}`);
    }
  }

  async getActivity(accessToken, activityId) {
    try {
      const response = await axios.get(`${this.baseURL}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get activity: ${error.message}`);
    }
  }

  async getAthleteStats(accessToken, athleteId) {
    try {
      const response = await axios.get(`${this.baseURL}/athletes/${athleteId}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }
}

module.exports = new StravaService();