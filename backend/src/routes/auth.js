const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Initialize Fitbit OAuth flow
router.get('/login', authController.initiateLogin);

// Handle OAuth callback from Fitbit
router.get('/callback', authController.handleCallback);

// Logout user
router.post('/logout', authController.logout);

// Get current session
router.get('/session', authController.getSession);

module.exports = router;