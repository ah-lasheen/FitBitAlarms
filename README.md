# FitBit Dashboard

A comprehensive fitness dashboard that displays key metrics from your Fitbit device including steps, distance, calories, active minutes, heart rate, and sleep data.

## Project Overview

This project provides a clean web interface to:
- Connect with your Fitbit account via OAuth
- View your fitness metrics in real-time
- Filter data by different time periods (Today/Week/Month/Year)
- Monitor your health and activity data

## Features

- **OAuth Authentication** with Fitbit
- **Real-time Data** from Fitbit API
- **Multiple Metrics**: Steps, Distance, Calories, Active Minutes, Heart Rate, Sleep
- **Time-based Filtering** for data visualization
- **Clean Dashboard Interface**

## Relevant Links:
- [Fitbit OAuth 2.0 Documentation](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
- [Fitbit OAuth 2.0 Tutorial](https://dev.fitbit.com/build/reference/web-api/troubleshooting-guide/oauth2-tutorial/?clientEncodedId=23QGJ2&redirectUri=http://localhost:5001/api/fitbit/callback&applicationType=PERSONAL)
- [Activity Endpoints](https://dev.fitbit.com/build/reference/web-api/activity/)
- [Heart Rate Endpoints](https://dev.fitbit.com/build/reference/web-api/heart-rate/)
- [Sleep Endpoints](https://dev.fitbit.com/build/reference/web-api/sleep/)

## Setup Instructions

### Backend Setup
1. Navigate to backend directory
2. Install dependencies: `npm install`
3. Create .env file with required environment variables from FitBit API
4. Start the server: `npm start`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

### API Testing
Get authorization URL:
```bash
curl http://localhost:5001/api/fitbit/auth-url
```

Get sleep data (after authorization):
```bash
curl http://localhost:5001/api/fitbit/sleep
```

Get activity data (steps, distance, calories, active minutes):
```bash
curl http://localhost:5001/api/fitbit/activity
```

Get heart rate data:
```bash
curl http://localhost:5001/api/fitbit/heart-rate
```

Get all metrics for a specific date:
```bash
curl "http://localhost:5001/api/fitbit/metrics?date=2025-02-11"
```

Get specific data for a date:
```bash
curl "http://localhost:5001/api/fitbit/sleep?date=2025-02-11"
curl "http://localhost:5001/api/fitbit/activity?date=2025-02-11"
curl "http://localhost:5001/api/fitbit/heart-rate?date=2025-02-11"
```