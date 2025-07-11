const axios = require('axios');
const querystring = require('querystring');

class FitbitService {
  constructor() {
    this.baseUrl = 'https://api.fitbit.com';
    this.authUrl = 'https://www.fitbit.com/oauth2/authorize';
    this.tokenUrl = 'https://api.fitbit.com/oauth2/token';
  }

  getAuthorizationUrl(clientId, redirectUri, scopes = ['sleep', 'profile']) {
    if (!clientId || !redirectUri) {
      throw new Error('Missing required parameters');
    }

    const params = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
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
}

module.exports = new FitbitService();
