import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const propsPath = path.join(rootDir, 'client', 'android', 'version.properties');
const packagePath = path.join(rootDir, 'client', 'package.json');
const configPath = path.join(rootDir, 'client', 'src', 'constants', 'config.js');

function bumpVersion() {
  console.log('--- AUTO VERSION BUMP ---');

  // 1. Update version.properties
  if (!fs.existsSync(propsPath)) {
    console.error(`Error: ${propsPath} not found`);
    process.exit(1);
  }

  let props = fs.readFileSync(propsPath, 'utf8');
  const majorMatch = props.match(/VERSION_MAJOR=(\d+)/);
  const minorMatch = props.match(/VERSION_MINOR=(\d+)/);

  if (!majorMatch || !minorMatch) {
    console.error('Error: Could not parse VERSION_MAJOR or VERSION_MINOR in version.properties');
    process.exit(1);
  }

  let major = parseInt(majorMatch[1]);
  let minor = parseInt(minorMatch[1]);

  minor += 1;
  const newVersion = `${major}.${minor}`;

  props = props.replace(/VERSION_MAJOR=\d+/, `VERSION_MAJOR=${major}`);
  props = props.replace(/VERSION_MINOR=\d+/, `VERSION_MINOR=${minor}`);
  props = props.replace(/#.*(\r?\n)/, `# Auto-incremented on ${new Date().toLocaleString()}$1`);

  fs.writeFileSync(propsPath, props);
  console.log(`[Android] Bumped to ${newVersion} (code: ${major * 10000 + minor})`);

  // 2. Update client/package.json
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    pkg.version = `${newVersion}.0`; // Simple semver mapping
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log(`[Package] Updated client/package.json to ${pkg.version}`);
  }

  // 3. Update config.js
  if (fs.existsSync(configPath)) {
    let config = fs.readFileSync(configPath, 'utf8');
    config = config.replace(
      /export const APP_VERSION = 'v[^']+';/,
      `export const APP_VERSION = 'v${newVersion}.0-auto';`
    );
    fs.writeFileSync(configPath, config);
    console.log(`[Config] Updated config.js to v${newVersion}.0-auto`);
  }

  console.log('--- BUMP COMPLETE ---');
}

bumpVersion();
