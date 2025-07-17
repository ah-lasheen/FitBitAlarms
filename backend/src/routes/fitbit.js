const express = require('express');
const router = express.Router();
const fitbitService = require('../services/fitbitService');
const { saveSleepData, getLatestSleepData } = require('../utils/fileUtils');
const fs = require('fs');
const path = require('path');

// Debug route to view tokens (temporary)
router.get('/debug/tokens', (req, res) => {
  if (!req.session.fitbitAccessToken) {
    return res.status(401).json({ 
      status: 'error',
      message: 'No active Fitbit session. Please authenticate first by visiting /api/fitbit/auth-url'
    });
  }
  
  // Calculate token expiration time
  const expiresIn = req.session.tokenExpiresIn || 0;
  const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
  
  res.json({
    status: 'success',
    hasAccessToken: !!req.session.fitbitAccessToken,
    accessToken: req.session.fitbitAccessToken,
    hasRefreshToken: !!req.session.fitbitRefreshToken,
    refreshToken: req.session.fitbitRefreshToken,
    tokenType: req.session.tokenType || 'Bearer',
    expiresIn: expiresIn,
    expiresAt: tokenExpiry.toISOString(),
    scopes: req.session.scopes || []
  });
});

// Get authorization URL
router.get('/auth-url', (req, res) => {
  try {
    if (!process.env.FITBIT_CLIENT_ID) {
      throw new Error('FITBIT_CLIENT_ID is not set in environment variables');
    }

    // Construct the redirect URI that matches exactly what's registered in Fitbit app settings
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/fitbit/callback`;
    
    console.log('Generating auth URL with:', {
      clientId: process.env.FITBIT_CLIENT_ID ? '***' : 'MISSING',
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

// Fitbit OAuth callback route
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      console.error('No authorization code received in callback');
      return res.status(400).json({ error: 'No authorization code provided' });
    }

    console.log('Received authorization code, exchanging for tokens...');
    
    // Reconstruct the redirect URI to match exactly what was used in the auth request
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
    
    if (!process.env.FITBIT_CLIENT_ID || !process.env.FITBIT_CLIENT_SECRET) {
      throw new Error('Missing Fitbit OAuth credentials in environment variables');
    }

    // Get tokens from Fitbit
    const tokens = await fitbitService.getTokens(
      code,
      process.env.FITBIT_CLIENT_ID,
      process.env.FITBIT_CLIENT_SECRET,
      redirectUri
    );

    if (!tokens.access_token) {
      throw new Error('No access token received from Fitbit');
    }

    console.log('Successfully received tokens from Fitbit');
    
    // Log token details (without exposing the actual tokens)
    console.log('Token details:', {
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in || 'N/A',
      token_type: tokens.token_type || 'N/A'
    });

    // Store access token in session for later API calls
    req.session.fitbitAccessToken = tokens.access_token;
    
    // Save refresh token if available (you might want to store this in a database in production)
    if (tokens.refresh_token) {
      req.session.fitbitRefreshToken = tokens.refresh_token;
    }

    // Redirect back to the frontend with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    
    // More detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Route to get sleep data from Fitbit
router.get('/sleep', async (req, res) => {
  const accessToken = req.session.fitbitAccessToken;
  if (!accessToken) {
    return res.status(401).json({ 
      status: 'error',
      error: 'Not authenticated',
      message: 'Please authorize with Fitbit first' 
    });
  }
  
  // Get date from query parameter or use today's date
  const dateParam = req.query.date || new Date().toISOString().split('T')[0];
  
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return res.status(400).json({ 
      status: 'error',
      error: 'Invalid date format',
      message: 'Please use YYYY-MM-DD format' 
    });
  }
  
  try {
    console.log(`Fetching sleep data for date: ${dateParam}`);
    
    // Fetch sleep data using the service
    const sleepData = await fitbitService.getSleepData(accessToken, dateParam);
    
    // Format the response
    const formattedData = {
      status: 'success',
      fetchTime: new Date().toISOString(),
      requestedDate: dateParam,
      ...sleepData
    };
    
    // Save to latest_sleep_data.json using fileUtils
    try {
      await saveSleepData(formattedData);
      console.log(`Latest sleep data updated for ${dateParam}`);
    } catch (fileError) {
      console.error('Error saving sleep data to file:', fileError);
      // Continue even if file save fails
    }
    
    res.json(formattedData);
    
  } catch (error) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: error.message,
      date: dateParam
    };
    
    // Add rate limit info if available
    if (error.response?.status === 429) {
      errorInfo.rateLimit = {
        retryAfter: error.response.headers['retry-after'] || '60',
        limit: error.response.headers['fitbit-rate-limit-limit'],
        remaining: error.response.headers['fitbit-rate-limit-remaining'],
        reset: error.response.headers['fitbit-rate-limit-reset']
      };
    }
    
    console.error('Error in /sleep:', errorInfo);
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      status: 'error',
      ...errorInfo
    });
  }
});

// Route to read the latest sleep data
router.get('/sleep/latest', async (req, res) => {
  try {
    const sleepData = await getLatestSleepData();
    if (!sleepData) {
      return res.status(404).json({ 
        status: 'error',
        error: 'No sleep data found',
        message: 'No sleep data has been fetched yet.' 
      });
    }
    res.json(sleepData);
  } catch (err) {
    console.error('Error getting latest sleep data:', err);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to read sleep data',
      details: err.message 
    });
  }
});

module.exports = router;
