# FitBit Alarms

A smart alarm system that uses Fitbit sleep data to optimize wake-up times based on calculated circadian cycles.

## Project Overview

This project aims to create a system that:
- Analyzes sleep data to determine optimal wake-up times
- Integrates with your fitbit device devices
- Provides a web interface for configuration and monitoring

## Relevant Links:
- [Sample FitBit JSON Data](https://support.mydatahelps.org/hc/en-us/articles/360049602813-Fitbit-Sleep-Log-Data-Export-Format)
- [Authorization OAuth 2.0 Docs](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
- [Fitbit OAuth 2.0 Tutorial](https://dev.fitbit.com/build/reference/web-api/troubleshooting-guide/oauth2-tutorial/?clientEncodedId=23QGJ2&redirectUri=http://localhost:5001/api/fitbit/callback&applicationType=PERSONAL)
- [Sleep Logs By Date Elements](https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-by-date/#Response)
- [Other Sleep Endpoints & Elements](https://dev.fitbit.com/build/reference/web-api/sleep/)

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

### API TESTING (ignore)
Get authorization URL:
curl http://localhost:5001/api/fitbit/auth-url

Get sleep data (after authorization):
curl http://localhost:5001/api/fitbit/sleep

Get sleep data for specific date:
curl "http://localhost:5001/api/fitbit/sleep?date=2025-02-11"