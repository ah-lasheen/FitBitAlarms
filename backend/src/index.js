require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fitbitRoutes = require('./routes/fitbit');

// v  erify required environment variables
const requiredEnvVars = ['FITBIT_CLIENT_ID', 'FITBIT_CLIENT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file in the backend directory');
  process.exit(1);
}

const app = express();

// cors middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

// json middleware
app.use(express.json());

// fitbit routes
app.use('/api/fitbit', fitbitRoutes);

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = 5001;

// starting the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
