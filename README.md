# FitBit Alarms

A smart alarm system that uses Fitbit sleep data to optimize wake-up times and integrates with smart devices for alarms.

## Project Overview

This project aims to create a system that:
- Tracks user sleep patterns using Fitbit
- Analyzes sleep data to determine optimal wake-up times
- Integrates with alexa smart devices
- Provides a web interface for configuration and monitoring

## Relevant Links:
- [Sample FitBit JSON Data](https://support.mydatahelps.org/hc/en-us/articles/360049602813-Fitbit-Sleep-Log-Data-Export-Format)
- [Authorization OAuth 2.0 Docs](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
- [Fitbit OAuth 2.0 Tutorial](https://dev.fitbit.com/build/reference/web-api/troubleshooting-guide/oauth2-tutorial/?clientEncodedId=23QGJ2&redirectUri=http://localhost:5001/api/fitbit/callback&applicationType=PERSONAL)
- [Sleep Logs By Date Elements](https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-by-date/#Response)
- [Other Sleep Endpoints & Elements](https://dev.fitbit.com/build/reference/web-api/sleep/)

## Tech Stack (Subject to updates)
- Backend: Node.js/Express
- Frontend: React
- Database: MongoDB
- Authentication: JWT
- Device Integration: Alexa Skills Kit

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
