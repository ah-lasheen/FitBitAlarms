# Sleep Monitor Script

This script monitors the Fitbit sleep API to track when new sleep data becomes available, helping to determine the update frequency of the Fitbit API.

## Setup

1. Ensure you have Node.js installed
2. Install the required dependencies:
   ```bash
   npm install dotenv axios
   ```
3. Create a `.env` file in the backend directory with your Fitbit access token:
   ```
   FITBIT_ACCESS_TOKEN=your_access_token_here
   ```

## Usage

1. Run the monitor script:
   ```bash
   node scripts/sleepMonitor.js
   ```

2. The script will:
   - Check for new sleep data every 5 minutes
   - Log results to `monitoring/sleep_monitor_log.json`
   - Display updates in the console

## Analyzing Results

The log file will contain timestamps and sleep data for each check. Look for patterns in the data to determine how often the Fitbit API updates with new sleep information.

To stop monitoring, press `Ctrl+C` in the terminal where the script is running.
