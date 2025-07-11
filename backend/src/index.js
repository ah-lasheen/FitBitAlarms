require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');

console.log('Starting server with basic middleware...');

const app = express();
const PORT = 5001;

// Add basic middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if using HTTPS
}));

// Add this after the session middleware
const fitbitRoutes = require('./routes/fitbit');
app.use('/api/fitbit', fitbitRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Environment variable checks
const requiredEnvVars = ['FITBIT_CLIENT_ID', 'FITBIT_CLIENT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file in the backend directory');
  process.exit(1);
}

// API root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Fitbit Alarms API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Not Found',
    path: req.path 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Create HTTP server
const server = http.createServer(app);

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Start listening on all network interfaces
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Log environment
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test the server from within Node.js (silent check)
  const testReq = http.get(`http://127.0.0.1:${PORT}`, (testRes) => {
    if (testRes.statusCode === 200) {
      console.log('Server is ready to accept connections');
    }
  });
  
  testReq.on('error', (e) => {
    console.error('Server self-test failed:', e.message);
  });
});

// Handle process signals
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
