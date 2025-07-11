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
    const requiredScopes = ['sleep', 'profile', 'activity'];
    
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

  async getSleepData(accessToken, date) {
    try {
      const response = await axios({
        method: 'get',
        url: `${this.baseUrl}/1.2/user/-/sleep/date/${date}.json`,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting sleep data:', error.response?.data || error.message);
      throw new Error('Failed to get sleep data');
    }
  }
}

module.exports = new FitbitService();
