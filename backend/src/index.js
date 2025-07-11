const express = require('express');
const cors = require('cors');
const fitbitRoutes = require('./routes/fitbit');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());

// Routes
app.use('/api/fitbit', fitbitRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = 5001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});
