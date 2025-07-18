require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');

console.log('Starting server with basic middleware...');

const app = express();
const PORT = 5001;

// Add basic middleware
app.use(express.json());

// Configure CORS with specific options
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

const session = require('express-session');

// Configure session middleware
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false, // Don't create session until something is stored
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS in production
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'fitbit_alarms.sid', // Custom session cookie name
  rolling: true // Reset the maxAge on every request
};

// In production, you might want to use a session store like Redis
// Example with Redis (uncomment and configure as needed):
// const RedisStore = require('connect-redis')(session);
// sessionConfig.store = new RedisStore({
//   host: 'localhost',
//   port: 6379,
//   client: redisClient,
//   ttl: 86400 // 24 hours
// });

app.use(session(sessionConfig));

// Import routes
const authRoutes = require('./routes/auth');
const fitbitRoutes = require('./routes/fitbit');

// API routes
app.use('/api/auth', authRoutes);
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
const requiredEnvVars = [
  'FITBIT_CLIENT_ID',
  'FITBIT_CLIENT_SECRET',
  'FITBIT_REDIRECT_URI',
  'FRONTEND_URL',
  'SESSION_SECRET'
];
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
