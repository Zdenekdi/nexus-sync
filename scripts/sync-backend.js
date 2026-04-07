const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../server');
const destDir = path.resolve(__dirname, '../../nexus-backend-clone');

const ignoreList = [
  'node_modules', 
  '.git', 
  '.github', 
  '.env', 
  'logs', 
  '.cache', 
  'coverage', 
  'npm-debug.log',
  '.prisma_cache'
];

function syncFiles(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src);
  for (const entry of entries) {
    if (ignoreList.includes(entry)) continue;

    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      syncFiles(srcPath, destPath);
    } else {
      // Overwrite the destination file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log(`Skenování srovnání obou složek...\nZdroj: ${srcDir}\nCíl: ${destDir}`);
  syncFiles(srcDir, destDir);
  console.log('Synchronizace do nexus-backend-clone kompletně dokončena!');
} catch (err) {
  console.error('Chyba při synchronizaci:', err);
  process.exit(1);
}
