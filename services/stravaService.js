const axios = require('axios');
const stravaConfig = require('../config/strava');

class StravaService {
  constructor() {
    this.baseURL = stravaConfig.apiUrl || 'https://www.strava.com/api/v3';
    this.authURL = 'https://www.strava.com/oauth';
    this.clientId = stravaConfig.clientId;
    this.clientSecret = stravaConfig.clientSecret;
    this.redirectUri = stravaConfig.redirectUri;
  }

  // Generate Strava OAuth authorization URL
  getAuthorizationUrl() {
    const scope = 'read,read_all,profile:read_all,activity:read,activity:read_all';
    return `${this.authURL}/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${scope}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    try {
      const response = await axios.post(`${this.authURL}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(response.data.expires_at * 1000),
        tokenType: response.data.token_type,
        athlete: response.data.athlete
      };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error(`Token exchange failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.authURL}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(response.data.expires_at * 1000),
        tokenType: response.data.token_type
      };
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Get authenticated athlete profile
  async getAthlete(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/athlete`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get athlete: ${error.message}`);
    }
  }

  // Get athlete activities with pagination
  async getAthleteActivities(accessToken, params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}/athlete/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          per_page: params.per_page || 200,
          page: params.page || 1,
          before: params.before,
          after: params.after
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get activities: ${error.message}`);
    }
  }

  // Get all activities with automatic pagination
  async getAllActivities(accessToken) {
    const allActivities = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const activities = await this.getAthleteActivities(accessToken, {
        page,
        per_page: perPage
      });

      if (activities.length === 0) break;

      allActivities.push(...activities);

      if (activities.length < perPage) break;

      page++;
    }

    return allActivities;
  }

  // Get single activity details
  async getActivity(accessToken, activityId) {
    try {
      const response = await axios.get(`${this.baseURL}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { include_all_efforts: true }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get activity: ${error.message}`);
    }
  }

  // Get athlete stats
  async getAthleteStats(accessToken, athleteId) {
    try {
      const response = await axios.get(`${this.baseURL}/athletes/${athleteId}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
  }

  // Deauthorize (disconnect Strava)
  async deauthorize(accessToken) {
    try {
      const response = await axios.post(`${this.authURL}/deauthorize`, null, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to deauthorize: ${error.message}`);
    }
  }
}

module.exports = new StravaService();
