const fitbitService = require('../services/fitbitService');

// Initialize login with Fitbit
exports.initiateLogin = (req, res) => {
  try {
    const authUrl = fitbitService.getAuthorizationUrl(
      process.env.FITBIT_CLIENT_ID,
      process.env.FITBIT_REDIRECT_URI
    );
    res.redirect(authUrl);
  } catch (error) {
    console.error('Login initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
};

// Handle OAuth callback from Fitbit
exports.handleCallback = async (req, res) => {
  try {
    console.log('OAuth callback received');
    const { code, error: oauthError } = req.query;
    
    // Check for OAuth errors
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`);
    }
    
    // Check for missing authorization code
    if (!code) {
      console.error('No authorization code provided');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }
    
    console.log('Exchanging authorization code for tokens...');
    
    // Exchange code for tokens
    const tokens = await fitbitService.getTokens(
      code,
      process.env.FITBIT_CLIENT_ID,
      process.env.FITBIT_CLIENT_SECRET,
      process.env.FITBIT_REDIRECT_URI
    );
    
    if (!tokens || !tokens.access_token) {
      throw new Error('Failed to obtain access token from Fitbit');
    }
    
    console.log('Successfully obtained tokens, fetching user profile...');
    
    // Get user profile
    const profile = await fitbitService.getUserProfile(tokens.access_token);
    
    if (!profile || !profile.user) {
      throw new Error('Failed to fetch user profile from Fitbit');
    }
    
    console.log(`Creating session for user: ${profile.user.displayName} (${profile.user.encodedId})`);
    
    // Create session
    req.session.regenerate((err) => {
      if (err) {
        console.error('Error regenerating session:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_error`);
      }
      
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
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_error`);
        }
        
        console.log('Session saved, setting auth cookie and redirecting...');
        
        // Set a cookie for the frontend to detect successful auth
        res.cookie('fitbit_auth', 'success', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 1000 * 60 * 60 * 24 // 1 day
        });
        
        // Redirect to the dashboard
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
      });
    });
  } catch (error) {
    console.error('Callback error:', error);
    const errorMessage = encodeURIComponent(error.message || 'auth_failed');
    res.redirect(`${process.env.FRONTEND_URL}/login?error=${errorMessage}`);
  }
};

// Logout user
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Successfully logged out' });
  });
};

// Get current user session
exports.getSession = (req, res) => {
  if (req.session.user) {
    const { accessToken, refreshToken, ...user } = req.session.user;
    res.json({ isAuthenticated: true, user });
  } else {
    res.json({ isAuthenticated: false });
  }
};