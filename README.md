# FitBit Alarms

A smart alarm system that uses Fitbit sleep data to optimize wake-up times and integrates with smart devices for physical alarms.

## Project Overview

This project aims to create a system that:
- Tracks user sleep patterns using Fitbit
- Analyzes sleep data to determine optimal wake-up times
- Integrates with alexa smart devices
- Provides a web interface for configuration and monitoring

## Tech Stack

- Backend: Node.js/Express
- Frontend: React
- Database: MongoDB
- Authentication: JWT
- Device Integration: Alexa Skills Kit

## Setup Instructions

### Backend Setup
1. Navigate to backend directory
2. Install dependencies: `npm install`
3. Create .env file with required environment variables
4. Start the server: `npm start`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Project Structure

```
FitBitAlarms/
├── backend/           # Express.js server
│   ├── src/          # Source code
│   │   ├── controllers/  # Route controllers
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   └── routes/      # API routes
│   ├── config/         # Configuration files
│   └── package.json
├── frontend/          # React application
│   ├── src/          # Source code
│   │   ├── components/  # React components
│   │   ├── pages/      # Page components
│   │   └── services/    # Frontend services
│   └── package.json
└── REA
