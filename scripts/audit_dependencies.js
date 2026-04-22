const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'public') {
        getFiles(name, files);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

function audit(projectPath, name) {
  console.log(`\n--- Auditing ${name} dependencies ---`);
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.warn(`No package.json found in ${projectPath}`);
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  const allDeps = new Set([...deps, ...devDeps]);

  const srcDir = path.join(projectPath, 'src');
  if (!fs.existsSync(srcDir)) {
    console.warn(`No src directory found in ${projectPath}`);
    return;
  }

  const files = getFiles(srcDir);
  const detectedDeps = new Set();

  const importRegex = /(?:import|from|require)\s*\(?\s*['"]([^'"]+)['"]\s*\)?/g;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const depPath = match[1];
      // Filter out relative imports and aliases
      if (!depPath.startsWith('.') && !depPath.startsWith('/') && !depPath.startsWith('..')) {
        // Handle scoped packages (e.g., @prisma/client) or sub-paths (e.g., lucide-react/icons)
        let depName = depPath;
        if (depPath.startsWith('@')) {
          depName = depPath.split('/').slice(0, 2).join('/');
        } else {
          depName = depPath.split('/')[0];
        }
        
        // Ignore built-in node modules (roughly)
        const builtIns = ['fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events', 'stream', 'url', 'querystring', 'child_process'];
        if (!builtIns.includes(depName) && depName !== 'react' && depName !== 'react-dom') {
          detectedDeps.add(depName);
        }
      }
    }
  });

  console.log(`Detected dependencies: ${Array.from(detectedDeps).join(', ')}`);
  
  const missing = [];
  detectedDeps.forEach(d => {
    if (!allDeps.has(d)) {
      missing.push(d);
    }
  });

  if (missing.length > 0) {
    console.error(`❌ MISSING DEPENDENCIES in ${name}: ${missing.join(', ')}`);
  } else {
    console.log(`✅ All dependencies in ${name} are accounted for.`);
  }
}

audit(path.join(PROJECT_ROOT, 'client'), 'Client');
audit(path.join(PROJECT_ROOT, 'server'), 'Server');
