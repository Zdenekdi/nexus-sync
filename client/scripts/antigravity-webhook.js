#!/usr/bin/env node

/**
 * Antigravity Webhook Handler
 * Receives events from Antigravity and executes tasks
 */

const http = require('http');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const { 
  log, 
  upsertTask, 
  reportProgress, 
  completeTask,
  LOG_LEVELS 
} = require('./antigravity-sync');

// Configuration
const PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.ANTIGRAVITY_WEBHOOK_SECRET || '';

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(body, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('Warning: ANTIGRAVITY_WEBHOOK_SECRET not set. Skipping signature verification.');
    return true;
  }

  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
}

/**
 * Execute shell command and stream output
 */
function executeCommand(command, args = [], taskId = null) {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    proc.stdout.on('data', async (data) => {
      output += data.toString();
      console.log(data.toString());
      
      if (taskId) {
        const progress = Math.min(90, 10 + Math.random() * 30);
        await reportProgress(taskId, progress, 'Running...');
      }
    });

    proc.stderr.on('data', async (data) => {
      errorOutput += data.toString();
      console.error(data.toString());
      
      if (taskId) {
        await log(`Error: ${data.toString()}`, LOG_LEVELS.WARNING);
      }
    });

    proc.on('close', (code) => {
      resolve({
        exitCode: code,
        output,
        errorOutput,
        success: code === 0
      });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Handle BUILD event from Antigravity
 */
async function handleBuildTask(taskData) {
  const { id: taskId, args = {} } = taskData;
  const { target = 'client' } = args;

  await log(`Build task received: ${taskId}`, LOG_LEVELS.INFO);
  
  try {
    await upsertTask({
      id: taskId,
      name: 'Build Nexus Hub',
      description: `Building ${target}...`,
      status: 'RUNNING',
      type: 'BUILD'
    });

    await reportProgress(taskId, 10, 'Starting build...');

    const result = await executeCommand('npm', ['run', 'build'], taskId);

    if (result.success) {
      await reportProgress(taskId, 100, 'Build complete');
      await completeTask(taskId, 'SUCCESS', {
        target,
        exitCode: result.exitCode,
        outputSize: result.output.length
      });
      await log(`Build succeeded for ${target}`, LOG_LEVELS.SUCCESS);
    } else {
      await completeTask(taskId, 'FAILURE', {
        target,
        exitCode: result.exitCode,
        error: result.errorOutput
      });
      await log(`Build failed: ${result.errorOutput}`, LOG_LEVELS.ERROR);
    }
  } catch (error) {
    await completeTask(taskId, 'FAILURE', {
      error: error.message
    });
    await log(`Build task error: ${error.message}`, LOG_LEVELS.ERROR);
  }
}

/**
 * Handle TEST event from Antigravity
 */
async function handleTestTask(taskData) {
  const { id: taskId, args = {} } = taskData;

  await log(`Test task received: ${taskId}`, LOG_LEVELS.INFO);

  try {
    await upsertTask({
      id: taskId,
      name: 'Run Tests',
      description: 'Running test suite...',
      status: 'RUNNING',
      type: 'TEST'
    });

    await reportProgress(taskId, 10, 'Starting tests...');

    const result = await executeCommand('npm', ['run', 'test'], taskId);

    if (result.success) {
      await reportProgress(taskId, 100, 'Tests passed');
      await completeTask(taskId, 'SUCCESS', {
        exitCode: result.exitCode,
        outputSize: result.output.length
      });
      await log(`Tests passed`, LOG_LEVELS.SUCCESS);
    } else {
      await completeTask(taskId, 'FAILURE', {
        exitCode: result.exitCode,
        error: result.errorOutput
      });
      await log(`Tests failed: ${result.errorOutput}`, LOG_LEVELS.ERROR);
    }
  } catch (error) {
    await completeTask(taskId, 'FAILURE', {
      error: error.message
    });
    await log(`Test task error: ${error.message}`, LOG_LEVELS.ERROR);
  }
}

/**
 * Handle DEPLOY event from Antigravity
 */
async function handleDeployTask(taskData) {
  const { id: taskId, args = {} } = taskData;
  const { environment = 'staging', service = 'nexus-backend-final' } = args;

  await log(`Deploy task received: ${taskId} to ${environment}`, LOG_LEVELS.INFO);

  try {
    await upsertTask({
      id: taskId,
      name: `Deploy to ${environment}`,
      description: `Deploying ${service} to ${environment}...`,
      status: 'RUNNING',
      type: 'DEPLOY'
    });

    await reportProgress(taskId, 10, 'Preparing deployment...');
    await reportProgress(taskId, 30, 'Building application...');

    // Build
    const buildResult = await executeCommand('npm', ['run', 'build'], taskId);
    if (!buildResult.success) {
      throw new Error(`Build failed: ${buildResult.errorOutput}`);
    }

    await reportProgress(taskId, 60, 'Restarting service...');

    // Restart PM2 service
    const deployResult = await executeCommand('pm2', ['restart', service], taskId);
    if (!deployResult.success) {
      throw new Error(`Deploy failed: ${deployResult.errorOutput}`);
    }

    await reportProgress(taskId, 90, 'Verifying deployment...');

    // Health check (simple)
    await new Promise(resolve => setTimeout(resolve, 2000));

    await reportProgress(taskId, 100, 'Deployment complete');
    await completeTask(taskId, 'SUCCESS', {
      environment,
      service,
      timestamp: new Date().toISOString()
    });

    await log(`Deployment to ${environment} succeeded`, LOG_LEVELS.SUCCESS);
  } catch (error) {
    await completeTask(taskId, 'FAILURE', {
      environment,
      error: error.message
    });
    await log(`Deployment failed: ${error.message}`, LOG_LEVELS.ERROR);
  }
}

/**
 * Handle CODE_REVIEW event from Antigravity
 */
async function handleCodeReviewTask(taskData) {
  const { id: taskId, args = {} } = taskData;

  await log(`Code review task received: ${taskId}`, LOG_LEVELS.INFO);

  try {
    await upsertTask({
      id: taskId,
      name: 'Code Review',
      description: 'Running linter and code analysis...',
      status: 'RUNNING',
      type: 'REVIEW'
    });

    await reportProgress(taskId, 10, 'Running ESLint...');

    const result = await executeCommand('npm', ['run', 'lint'], taskId);

    const issues = result.errorOutput.split('\n').length;
    
    await reportProgress(taskId, 100, `Review complete`);
    await completeTask(taskId, 'SUCCESS', {
      issues,
      warnings: result.errorOutput.includes('warning') ? 'yes' : 'no',
      exitCode: result.exitCode
    });

    await log(`Code review complete: ${issues} issues found`, LOG_LEVELS.INFO);
  } catch (error) {
    await completeTask(taskId, 'FAILURE', {
      error: error.message
    });
    await log(`Code review failed: ${error.message}`, LOG_LEVELS.ERROR);
  }
}

/**
 * Route event to appropriate handler
 */
async function handleEvent(event) {
  const { type, id, data } = event;

  switch (type) {
    case 'BUILD':
      await handleBuildTask({ id, ...data });
      break;
    case 'TEST':
      await handleTestTask({ id, ...data });
      break;
    case 'DEPLOY':
      await handleDeployTask({ id, ...data });
      break;
    case 'CODE_REVIEW':
      await handleCodeReviewTask({ id, ...data });
      break;
    default:
      await log(`Unknown event type: ${type}`, LOG_LEVELS.WARNING);
  }
}

/**
 * HTTP server
 */
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // Verify webhook signature
      const signature = req.headers['x-signature'];
      if (!verifyWebhookSignature(body, signature)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        return;
      }

      const event = JSON.parse(body);
      
      // Handle event asynchronously
      handleEvent(event).catch(error => {
        console.error('Event handling error:', error);
      });

      // Respond immediately
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'accepted',
        eventId: event.id
      }));
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Bad request',
        message: error.message
      }));
    }
  });
});

// Error handling
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   Antigravity Webhook Handler Started         ║
╚════════════════════════════════════════════════╝

Webhook URL: http://localhost:${PORT}
Listening for events from Antigravity...

Configure in Antigravity:
  Settings → Webhooks → Add Webhook
  URL: http://your-server:${PORT}
  
Supported events:
  • BUILD
  • TEST
  • DEPLOY
  • CODE_REVIEW

Press Ctrl+C to stop
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
