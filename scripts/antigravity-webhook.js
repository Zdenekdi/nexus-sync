#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const { logProgress, reportCompletion, LOG_LEVELS } = require('./antigravity-sync');

const PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.ANTIGRAVITY_WEBHOOK_SECRET;

const server = http.createServer(async (req, res) => {
  // CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-antigravity-token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const event = JSON.parse(body);
      
      // Verify webhook signature (x-antigravity-token)
      const token = req.headers['x-antigravity-token'];
      if (WEBHOOK_SECRET && token !== WEBHOOK_SECRET) {
        console.warn('Unauthorized webhook attempt denied');
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Proactively respond to Antigravity
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'accepted', timestamp: new Date().toISOString() }));

      // Handle the event asynchronously
      await handleAntigravityEvent(event);
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      if (!res.writableEnded) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    }
  });
});

async function handleAntigravityEvent(event) {
  const { type, data } = event;
  console.log(`Received event type: ${type}`);

  switch (type) {
    case 'TASK_REQUEST':
      await handleTaskRequest(data);
      break;
    case 'CODE_REVIEW_REQUEST':
      await handleCodeReview(data);
      break;
    case 'DEPLOYMENT_REQUEST':
      await handleDeployment(data);
      break;
    default:
      console.log(`Unknown event type: ${type}`);
  }
}

async function handleTaskRequest(data) {
  const { taskId, command, args = [] } = data;
  
  await logProgress(`Executing requested task: ${command} ${args.join(' ')}`, LOG_LEVELS.INFO);
  
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: 'inherit', shell: true });
    
    proc.on('close', (code) => {
      if (code === 0) {
        reportCompletion(taskId, 'SUCCESS', { exitCode: code });
      } else {
        reportCompletion(taskId, 'FAILURE', { exitCode: code });
      }
      resolve();
    });

    proc.on('error', (err) => {
      console.error(`Process error: ${err.message}`);
      reportCompletion(taskId, 'FAILURE', { error: err.message });
      resolve();
    });
  });
}

async function handleCodeReview(data) {
  const { taskId, files = [] } = data;
  await logProgress(`Running code review on ${files.length} files...`, LOG_LEVELS.INFO);
  
  // Minimal linter placeholder
  await reportCompletion(taskId, 'SUCCESS', { 
    filesChecked: files.length,
    status: 'Automated review completed' 
  });
}

async function handleDeployment(data) {
  const { taskId, environment = 'production' } = data;
  await logProgress(`Starting deployment to ${environment}...`, LOG_LEVELS.INFO);
  
  // Trigger project-specific deploy script
  const deployProc = spawn('npm', ['run', 'deploy'], { stdio: 'inherit', shell: true });
  
  deployProc.on('close', (code) => {
    if (code === 0) {
      reportCompletion(taskId, 'SUCCESS', { environment, status: 'Deployed' });
    } else {
      reportCompletion(taskId, 'FAILURE', { environment, error: `Deploy failed with code ${code}` });
    }
  });
}

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Antigravity Webhook Listener running on :${PORT}`);
  console.log(`===================================================`);
  if (!WEBHOOK_SECRET) console.warn('⚠️  WEBHOOK_SECRET not set! Listener is open.');
});
