const express = require('express');
const router = express.Router();
const fitbitService = require('../services/fitbitService');

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

    // Use the redirect URI from environment variables to ensure consistency
    const redirectUri = process.env.FITBIT_REDIRECT_URI;
    
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

    // Get user profile to set up the session properly
    try {
      console.log('Fetching user profile to set up session...');
      const profile = await fitbitService.getUserProfile(tokens.access_token);
      
      if (profile && profile.user) {
        console.log(`Setting up session for user: ${profile.user.displayName} (${profile.user.encodedId})`);
        
        // Set up the user session (similar to authController)
        req.session.user = {
          id: profile.user.encodedId,
          displayName: profile.user.displayName,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + (tokens.expires_in * 1000)
        };
        
        // Save the session
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session:', err);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
            res.redirect(`${frontendUrl}?auth=error&message=session_error`);
            return;
          }
          
          console.log('Session saved successfully');
          
          // Set a cookie for the frontend to detect successful auth
          res.cookie('fitbit_auth', 'success', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 // 1 day
          });
          
          // Redirect back to the frontend with success message
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
          res.redirect(`${frontendUrl}?auth=success`);
        });
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (profileError) {
      console.error('Error fetching user profile:', profileError);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      res.redirect(`${frontendUrl}?auth=error&message=profile_error`);
    }
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    
    // More detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
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

// Route to get activity data (steps, distance, calories, active minutes)
router.get('/activity', async (req, res) => {
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
    console.log(`Fetching activity data for date: ${dateParam}`);
    
    // Fetch activity data using the service
    const activityData = await fitbitService.getActivityData(accessToken, dateParam);
    
    // Format the response
    const formattedData = {
      status: 'success',
      fetchTime: new Date().toISOString(),
      requestedDate: dateParam,
      ...activityData
    };
    
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
    
    console.error('Error in /activity:', errorInfo);
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      status: 'error',
      ...errorInfo
    });
  }
});

// Route to get heart rate data
router.get('/heart-rate', async (req, res) => {
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
    console.log(`Fetching heart rate data for date: ${dateParam}`);
    
    // Fetch heart rate data using the service
    const heartRateData = await fitbitService.getHeartRateData(accessToken, dateParam);
    
    // Format the response
    const formattedData = {
      status: 'success',
      fetchTime: new Date().toISOString(),
      requestedDate: dateParam,
      ...heartRateData
    };
    
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
    
    console.error('Error in /heart-rate:', errorInfo);
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      status: 'error',
      ...errorInfo
    });
  }
});

// Route to get all metrics for a specific date
router.get('/metrics', async (req, res) => {
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
    console.log(`Fetching all metrics for date: ${dateParam}`);
    
    // Fetch all metrics in parallel
    const [sleepData, activityData, heartRateData, heartRateIntradayData] = await Promise.allSettled([
      fitbitService.getSleepData(accessToken, dateParam),
      fitbitService.getActivityData(accessToken, dateParam),
      fitbitService.getHeartRateData(accessToken, dateParam),
      fitbitService.getHeartRateIntradayData(accessToken, dateParam)
    ]);
    
    // Log the raw data for debugging
    console.log('Sleep data result:', sleepData.status === 'fulfilled' ? 'SUCCESS' : 'FAILED', sleepData.status === 'fulfilled' ? Object.keys(sleepData.value) : sleepData.reason?.message);
    console.log('Activity data result:', activityData.status === 'fulfilled' ? 'SUCCESS' : 'FAILED', activityData.status === 'fulfilled' ? Object.keys(activityData.value) : activityData.reason?.message);
    console.log('Heart rate data result:', heartRateData.status === 'fulfilled' ? 'SUCCESS' : 'FAILED', heartRateData.status === 'fulfilled' ? Object.keys(heartRateData.value) : heartRateData.reason?.message);
    console.log('Heart rate intraday data result:', heartRateIntradayData.status === 'fulfilled' ? 'SUCCESS' : 'FAILED', heartRateIntradayData.status === 'fulfilled' ? Object.keys(heartRateIntradayData.value) : heartRateIntradayData.reason?.message);
    
    // Format the response
    const formattedData = {
      status: 'success',
      fetchTime: new Date().toISOString(),
      requestedDate: dateParam,
      sleep: sleepData.status === 'fulfilled' ? sleepData.value : { error: sleepData.reason?.message || 'Failed to fetch sleep data' },
      activity: activityData.status === 'fulfilled' ? activityData.value : { error: activityData.reason?.message || 'Failed to fetch activity data' },
      heartRate: {
        ...(heartRateData.status === 'fulfilled' ? heartRateData.value : { error: heartRateData.reason?.message || 'Failed to fetch heart rate data' }),
        ...(heartRateIntradayData.status === 'fulfilled' ? heartRateIntradayData.value : {})
      }
    };
    
    console.log('Sending formatted data with keys:', Object.keys(formattedData));
    res.json(formattedData);
    
  } catch (error) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: error.message,
      date: dateParam
    };
    
    console.error('Error in /metrics:', errorInfo);
    
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      status: 'error',
      ...errorInfo
    });
  }
});

module.exports = router;
