const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const LATEST_SLEEP_FILE = path.join(DATA_DIR, 'latest_sleep_data.json');

async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function saveSleepData(data) {
  try {
    await ensureDataDirectory();
    await fs.writeFile(LATEST_SLEEP_FILE, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving sleep data:', error);
    throw new Error('Failed to save sleep data');
  }
}

async function getLatestSleepData() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(LATEST_SLEEP_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist yet
    }
    console.error('Error reading sleep data:', error);
    throw new Error('Failed to read sleep data');
  }
}

module.exports = {
  saveSleepData,
  getLatestSleepData
};
