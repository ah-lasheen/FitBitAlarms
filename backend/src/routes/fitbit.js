const express = require('express');
const router = express.Router();
const fitbitService = require('../services/fitbitService');

// Get authorization URL
router.get('/auth-url', (req, res) => {
  try {
    const authUrl = fitbitService.getAuthorizationUrl(
      process.env.FITBIT_CLIENT_ID,
      process.env.FRONTEND_URL || 'http://localhost:3000',
      ['sleep', 'profile']
    );
    
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    res.status(500).json({ error: 'Failed to get authorization URL' });
  }
});

// Fitbit OAuth callback route
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Get tokens from Fitbit
    const tokens = await fitbitService.getTokens(
      code,
      process.env.FITBIT_CLIENT_ID,
      process.env.FITBIT_CLIENT_SECRET,
      process.env.FRONTEND_URL || 'http://localhost:3000'
    );

    // For now, just log the tokens (in production, you'd want to store these securely)
    console.log('Received Fitbit tokens:', {
      access_token: tokens.access_token ? '***' : 'missing',
      refresh_token: tokens.refresh_token ? '***' : 'missing',
      expires_in: tokens.expires_in || 'N/A'
    });

    // Redirect back to the frontend
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

module.exports = router;
