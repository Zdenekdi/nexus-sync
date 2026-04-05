#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables if .antigravity.env exists
const envPath = path.resolve(__dirname, '../.antigravity.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const ANTIGRAVITY_API_KEY = process.env.ANTIGRAVITY_API_KEY;
const ANTIGRAVITY_BASE_URL = process.env.ANTIGRAVITY_BASE_URL || 'http://localhost:8080';
const ANTIGRAVITY_PROJECT_ID = process.env.ANTIGRAVITY_PROJECT_ID || 'nexus-hub';

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

// Sync task to Antigravity
async function syncTask(taskData) {
  if (!ANTIGRAVITY_API_KEY) {
    console.warn('Skipping sync: ANTIGRAVITY_API_KEY not set');
    return;
  }

  return new Promise((resolve, reject) => {
    const url = new URL(ANTIGRAVITY_BASE_URL);
    const endpoint = `/api/projects/${ANTIGRAVITY_PROJECT_ID}/tasks`;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANTIGRAVITY_API_KEY}`,
        'User-Agent': 'Copilot-CLI/1.0'
      }
    };

    const client = url.protocol === 'https:' ? https : require('http');
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(taskData));
    req.end();
  });
}

// Log task progress
async function logProgress(message, level = LOG_LEVELS.INFO) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    message,
    source: 'copilot-cli'
  };

  try {
    await syncTask({ type: 'LOG', data: logData });
    console.log(`[${level}] ${message}`);
  } catch (error) {
    console.error(`Failed to log to Antigravity: ${error.message}`);
  }
}

// Report task completion
async function reportCompletion(taskId, status, results) {
  const completionData = {
    type: 'TASK_COMPLETION',
    data: {
      taskId,
      status, // 'SUCCESS', 'FAILURE', 'PARTIAL'
      results,
      timestamp: new Date().toISOString()
    }
  };

  try {
    await syncTask(completionData);
    console.log(`Task ${taskId} reported to Antigravity as: ${status}`);
  } catch (error) {
    console.error(`Failed to report completion: ${error.message}`);
  }
}

// Initializing CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'start-task') {
    const taskId = args[1];
    logProgress(`Starting task: ${taskId}`, LOG_LEVELS.INFO);
  } else if (command === 'complete-task') {
    const taskId = args[1];
    const status = args[2] || 'SUCCESS';
    reportCompletion(taskId, status, { manual: true });
  } else {
    console.log('Usage: node antigravity-sync.js [start-task|complete-task] [taskId] [status]');
  }
}

module.exports = {
  syncTask,
  logProgress,
  reportCompletion,
  LOG_LEVELS
};
