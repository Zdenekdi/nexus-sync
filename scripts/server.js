import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8080;
const PUBLIC_DIR = path.resolve(process.cwd(), 'client/dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  console.log(`[Server] Request: ${req.url}`);
  
  // Clean request URL to map to filesystem path
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = urlObj.pathname;
  
  // Default to index.html for SPA routes (if file doesn't exist)
  let filePath = path.join(PUBLIC_DIR, pathname);
  
  if (pathname.endsWith('/') || !path.extname(pathname)) {
    // If it's a directory or doesn't have an extension, try index.html first or treat as SPA route
    const checkIndex = path.join(PUBLIC_DIR, pathname, 'index.html');
    if (fs.existsSync(checkIndex)) {
      filePath = checkIndex;
    } else {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
  }

  // Check if file exists
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Static server running at http://127.0.0.1:${PORT}`);
});
