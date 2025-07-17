require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_LOG_ENTRIES = 1000;
const LOG_FILE = path.join(__dirname, '../../monitoring/sleep_monitor_log.json');

// Fitbit API credentials
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
let accessToken = process.env.FITBIT_ACCESS_TOKEN;
let refreshToken = process.env.FITBIT_REFRESH_TOKEN;

// Ensure the monitoring directory exists
async function ensureMonitoringDir() {
  const dir = path.dirname(LOG_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Load existing log or create new one
async function loadLog() {
  try {
    const data = await fs.readFile(LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// Save log to file
async function saveLog(log) {
  // Keep only the most recent entries
  const recentLogs = log.slice(-MAX_LOG_ENTRIES);
  await fs.writeFile(LOG_FILE, JSON.stringify(recentLogs, null, 2), 'utf8');
}

// Refresh the access token
async function refreshAccessToken() {
  try {
    const authHeader = Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64');
    
    const response = await axios({
      method: 'post',
      url: 'https://api.fitbit.com/oauth2/token',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    // Update tokens
    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token || refreshToken;
    
    console.log('Successfully refreshed access token');
    return accessToken;
  } catch (error) {
    console.error('Error refreshing access token:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

// Check for new sleep data
async function checkSleepData() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    // Get current sleep data
    const response = await axios({
      method: 'get',
      url: `https://api.fitbit.com/1.2/user/-/sleep/date/${dateStr}.json`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Accept-Language': 'en_US'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const sleepData = response.data;
    
    // Get the most recent sleep log if any
    const latestSleep = sleepData.sleep?.sort((a, b) => 
      new Date(b.endTime) - new Date(a.endTime)
    )[0];
    
    return {
      timestamp: now.toISOString(),
      hasData: !!latestSleep,
      latestSleepEnd: latestSleep?.endTime,
      sleepData: sleepData
    };
  } catch (error) {
    // If token is invalid, try to refresh it once
    if (error.response?.status === 401) {
      console.log('Access token expired, attempting to refresh...');
      try {
        await refreshAccessToken();
        // Retry the request with new token
        return await checkSleepData();
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError.message);
      }
    }
    
    console.error('Error checking sleep data:', error.response?.data || error.message);
    return {
      timestamp: now.toISOString(),
      error: error.message,
      response: error.response?.data
    };
  }
}

// Main monitoring function
async function startMonitoring() {
  if (!accessToken || !refreshToken) {
    throw new Error('Missing access token or refresh token. Please set FITBIT_ACCESS_TOKEN and FITBIT_REFRESH_TOKEN in your .env file');
  }

  if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET) {
    throw new Error('Missing Fitbit client credentials. Please set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET in your .env file');
  }

  await ensureMonitoringDir();
  let log = await loadLog();
  
  console.log('Starting Fitbit sleep data monitoring...');
  console.log(`Checking every ${CHECK_INTERVAL_MS / 60000} minutes`);
  
  // Initial check
  const initialResult = await checkSleepData();
  log.push(initialResult);
  await saveLog(log);
  
  // Log initial result
  console.log(`[${new Date().toISOString()}] Initial check complete. Has data: ${initialResult.hasData}`);
  if (initialResult.latestSleepEnd) {
    console.log(`  Latest sleep ended at: ${initialResult.latestSleepEnd}`);
  }
  
  // Schedule periodic checks
  const intervalId = setInterval(async () => {
    const result = await checkSleepData();
    log.push(result);
    await saveLog(log);
    
    console.log(`[${new Date().toISOString()}] Checked sleep data. Has data: ${result.hasData}`);
    if (result.latestSleepEnd) {
      console.log(`  Latest sleep ended at: ${result.latestSleepEnd}`);
    }
  }, CHECK_INTERVAL_MS);
  
  // Handle process termination
  process.on('SIGINT', async () => {
    clearInterval(intervalId);
    console.log('\nMonitoring stopped. Saving final log...');
    await saveLog(log);
    process.exit(0);
  });
}

// Run if this file is executed directly
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  checkSleepData,
  startMonitoring
};
