/* global process */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const androidAssetsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
const publicDir = path.join(androidAssetsDir, 'public');
const capacitorConfigPath = path.join(androidAssetsDir, 'capacitor.config.json');

if (!fs.existsSync(distDir)) {
  console.error('Missing dist/ folder. Run the frontend build first.');
  process.exit(1);
}

fs.mkdirSync(androidAssetsDir, { recursive: true });
fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(distDir, publicDir, { recursive: true });

const capacitorConfig = {
  appId: 'com.nexushub.app',
  appName: 'Nexus Relay',
  webDir: 'dist'
};

fs.writeFileSync(capacitorConfigPath, `${JSON.stringify(capacitorConfig, null, 2)}\n`, 'utf8');

console.log(`Synced ${path.relative(projectRoot, distDir)} -> ${path.relative(projectRoot, publicDir)}`);
console.log(`Updated ${path.relative(projectRoot, capacitorConfigPath)}`);
