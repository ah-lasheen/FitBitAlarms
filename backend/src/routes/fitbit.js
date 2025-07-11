const express = require('express');
const router = express.Router();
const fitbitService = require('../services/fitbitService');

// get authorization url
router.get('/auth-url', (req, res) => {
  try {
    console.log('Environment variables:', {
      FITBIT_CLIENT_ID: process.env.FITBIT_CLIENT_ID ? '***' : 'MISSING',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
    });

    if (!process.env.FITBIT_CLIENT_ID) {
      throw new Error('FITBIT_CLIENT_ID is not set in environment variables');
    }

    const redirectUri = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('Generating auth URL with:', {
      clientId: process.env.FITBIT_CLIENT_ID,
      redirectUri: redirectUri
    });

    const authUrl = fitbitService.getAuthorizationUrl(
      process.env.FITBIT_CLIENT_ID,
      redirectUri
    );
    
    console.log('Successfully generated auth URL');
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to get authorization URL',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// fitbit oauth callback route
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      console.error('No authorization code received in callback');
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    console.log('Received authorization code, exchanging for tokens...');
    
    // Use the exact same redirect URI that was used in the auth request
    const redirectUri = 'http://localhost:5001/api/fitbit/callback';
    
    // Get tokens from Fitbit
    const tokens = await fitbitService.getTokens(
      code,
      process.env.FITBIT_CLIENT_ID,
      process.env.FITBIT_CLIENT_SECRET,
      redirectUri  // Use the exact same redirect URI
    );

    console.log('Successfully received tokens from Fitbit');
    
    // Log token details (without exposing the actual tokens)
    console.log('Token details:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in || 'N/A',
      token_type: tokens.token_type || 'N/A'
    });

    // redirect back to the frontend with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

module.exports = router;
