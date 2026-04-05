#!/usr/bin/env node

/**
 * Antigravity Sync Module
 * Handles communication between Copilot CLI and Google Antigravity
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  apiKey: process.env.ANTIGRAVITY_API_KEY || '',
  baseUrl: process.env.ANTIGRAVITY_BASE_URL || '',
  projectId: process.env.ANTIGRAVITY_PROJECT_ID || 'nexus-hub',
  timeout: 30000
};

// Validate configuration
if (!config.apiKey || !config.baseUrl) {
  console.error('Error: ANTIGRAVITY_API_KEY and ANTIGRAVITY_BASE_URL environment variables must be set');
  process.exit(1);
}

// Parse URL
const baseUrlParts = new URL(config.baseUrl);

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
};

/**
 * Make HTTP request to Antigravity API
 */
function makeRequest(method, endpoint, payload = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: baseUrlParts.hostname,
      port: baseUrlParts.port || 443,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'User-Agent': 'Copilot-CLI/1.0',
        'X-Project-ID': config.projectId
      },
      timeout: config.timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              data: parsed
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || data || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

/**
 * Log message to Antigravity
 */
async function log(message, level = LOG_LEVELS.INFO, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata,
    source: 'copilot-cli',
    hostname: require('os').hostname(),
    pid: process.pid
  };

  try {
    await makeRequest('POST', `/api/projects/${config.projectId}/logs`, logEntry);
    console.log(`[${level}] ${message}`);
    return true;
  } catch (error) {
    console.error(`Failed to log to Antigravity: ${error.message}`);
    // Log locally as fallback
    console.log(`[${level}] ${message}`);
    return false;
  }
}

/**
 * Create or update task
 */
async function upsertTask(taskData) {
  const payload = {
    id: taskData.id || `task-${Date.now()}`,
    name: taskData.name,
    description: taskData.description,
    status: taskData.status || 'PENDING', // PENDING, RUNNING, SUCCESS, FAILURE
    type: taskData.type || 'GENERAL', // GENERAL, BUILD, TEST, DEPLOY, REVIEW
    metadata: {
      startTime: taskData.startTime || new Date().toISOString(),
      endTime: taskData.endTime || null,
      duration: taskData.duration || null,
      ...taskData.metadata
    }
  };

  try {
    const response = await makeRequest('POST', `/api/projects/${config.projectId}/tasks`, payload);
    await log(`Task created: ${payload.id}`, LOG_LEVELS.SUCCESS);
    return response.data;
  } catch (error) {
    await log(`Failed to create task: ${error.message}`, LOG_LEVELS.ERROR);
    throw error;
  }
}

/**
 * Report task progress
 */
async function reportProgress(taskId, progress, message) {
  const payload = {
    taskId,
    progress: Math.min(100, Math.max(0, progress)), // 0-100
    message,
    timestamp: new Date().toISOString()
  };

  try {
    await makeRequest('POST', `/api/projects/${config.projectId}/tasks/${taskId}/progress`, payload);
    await log(`Task ${taskId}: ${progress}% - ${message}`, LOG_LEVELS.INFO);
    return true;
  } catch (error) {
    console.error(`Failed to report progress: ${error.message}`);
    return false;
  }
}

/**
 * Complete task
 */
async function completeTask(taskId, status, results = {}) {
  const payload = {
    status: status, // SUCCESS, FAILURE, PARTIAL
    results,
    completedAt: new Date().toISOString()
  };

  try {
    const response = await makeRequest('PATCH', `/api/projects/${config.projectId}/tasks/${taskId}`, payload);
    const statusEmoji = status === 'SUCCESS' ? '✅' : status === 'FAILURE' ? '❌' : '⚠️';
    await log(`Task ${taskId} completed: ${status}`, statusEmoji === '✅' ? LOG_LEVELS.SUCCESS : LOG_LEVELS.WARNING);
    return response.data;
  } catch (error) {
    await log(`Failed to complete task: ${error.message}`, LOG_LEVELS.ERROR);
    throw error;
  }
}

/**
 * Report metrics
 */
async function reportMetrics(metrics) {
  const payload = {
    timestamp: new Date().toISOString(),
    metrics: {
      buildTime: metrics.buildTime,
      testCoverage: metrics.testCoverage,
      bundleSize: metrics.bundleSize,
      errorCount: metrics.errorCount,
      warningCount: metrics.warningCount,
      ...metrics
    }
  };

  try {
    await makeRequest('POST', `/api/projects/${config.projectId}/metrics`, payload);
    await log('Metrics reported', LOG_LEVELS.INFO);
    return true;
  } catch (error) {
    console.error(`Failed to report metrics: ${error.message}`);
    return false;
  }
}

/**
 * Get project status
 */
async function getProjectStatus() {
  try {
    const response = await makeRequest('GET', `/api/projects/${config.projectId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to get project status: ${error.message}`);
    return null;
  }
}

/**
 * Test connection to Antigravity
 */
async function testConnection() {
  try {
    const response = await makeRequest('GET', '/api/health');
    await log('✅ Connected to Antigravity', LOG_LEVELS.SUCCESS);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Antigravity: ${error.message}`);
    return false;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'test':
      await testConnection();
      break;

    case 'status':
      const status = await getProjectStatus();
      console.log(JSON.stringify(status, null, 2));
      break;

    case 'log':
      const message = args.slice(1).join(' ');
      const level = args[1] && Object.values(LOG_LEVELS).includes(args[1].toUpperCase()) 
        ? args[1].toUpperCase() 
        : LOG_LEVELS.INFO;
      await log(message, level);
      break;

    case 'task':
      if (args[1] === 'create') {
        const taskData = {
          id: args[2],
          name: args[3],
          description: args.slice(4).join(' ')
        };
        const result = await upsertTask(taskData);
        console.log(JSON.stringify(result, null, 2));
      } else if (args[1] === 'complete') {
        const result = await completeTask(args[2], args[3] || 'SUCCESS', {});
        console.log(JSON.stringify(result, null, 2));
      }
      break;

    default:
      console.log(`
Antigravity Sync CLI

Usage: node antigravity-sync.js <command> [args]

Commands:
  test                              Test connection to Antigravity
  status                            Get project status
  log <message> [level]             Log a message
  task create <id> <name> [desc]    Create a task
  task complete <id> <status>       Complete a task

Examples:
  node antigravity-sync.js test
  node antigravity-sync.js log "Build started" INFO
  node antigravity-sync.js task create build-123 "Build Nexus Hub"
  node antigravity-sync.js task complete build-123 SUCCESS
      `);
  }
}

// Export for use as module
module.exports = {
  log,
  upsertTask,
  reportProgress,
  completeTask,
  reportMetrics,
  getProjectStatus,
  testConnection,
  LOG_LEVELS,
  config
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
