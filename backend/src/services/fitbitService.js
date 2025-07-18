const axios = require('axios');
const querystring = require('querystring');

class FitbitService {
  constructor() {
    this.baseUrl = 'https://api.fitbit.com';
    this.authUrl = 'https://www.fitbit.com/oauth2/authorize';
    this.tokenUrl = 'https://api.fitbit.com/oauth2/token';
  }

  getAuthorizationUrl(clientId, redirectUri) {
    if (!clientId || !redirectUri) {
      throw new Error('Missing required parameters: clientId and redirectUri');
    }

    // Always request these scopes
    const requiredScopes = ['sleep', 'profile', 'activity', 'heartrate'];
    
    console.log('Using redirect_uri:', redirectUri);
    
    const params = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: requiredScopes.join(' '),
      expires_in: 604800, // 7 days
    };

    return `${this.authUrl}?${querystring.stringify(params)}`;
  }

  async getTokens(code, clientId, clientSecret, redirectUri) {
    if (!code || !clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required parameters');
    }

    try {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await axios({
        method: 'post',
        url: this.tokenUrl,
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: querystring.stringify({
          code,
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri
        })
      });

      return response.data;
    } catch (error) {
      console.error('Error getting tokens:', error.response?.data || error.message);
      throw new Error('Failed to get tokens from Fitbit');
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/profile.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error.response?.data || error.message);
      throw new Error('Failed to get user profile');
    }
  }

  async getSleepData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1.2/user/-/sleep/date/${date}.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting sleep data:', error.response?.data || error.message);
      throw new Error('Failed to get sleep data');
    }
  }

  async getActivityData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/activities/date/${date}.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting activity data:', error.response?.data || error.message);
      throw new Error('Failed to get activity data');
    }
  }

  async getHeartRateData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/activities/heart/date/${date}/1d.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting heart rate data:', error.response?.data || error.message);
      throw new Error('Failed to get heart rate data');
    }
  }

  async getStepsData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/activities/steps/date/${date}/1d.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting steps data:', error.response?.data || error.message);
      throw new Error('Failed to get steps data');
    }
  }

  async getDistanceData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/activities/distance/date/${date}/1d.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting distance data:', error.response?.data || error.message);
      throw new Error('Failed to get distance data');
    }
  }

  async getCaloriesData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/activities/calories/date/${date}/1d.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting calories data:', error.response?.data || error.message);
      throw new Error('Failed to get calories data');
    }
  }

  async getActiveMinutesData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1/user/-/activities/minutesActive/date/${date}/1d.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting active minutes data:', error.response?.data || error.message);
      throw new Error('Failed to get active minutes data');
    }
  }

  async getSleepData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1.2/user/-/sleep/date/${date}.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Accept-Language': 'en_US'
        },
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting sleep data:', error.response?.data || error.message);
      throw new Error('Failed to get sleep data');
    }
  }
}

module.exports = new FitbitService();
