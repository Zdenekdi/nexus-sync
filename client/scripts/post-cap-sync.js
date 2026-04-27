/* global process */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const targets = [
  path.join(projectRoot, 'android', 'app', 'build.gradle'),
  path.join(projectRoot, 'android', 'capacitor-cordova-android-plugins', 'build.gradle'),
];

const flatDirBlock = /\n\s*flatDir\s*\{[\s\S]*?\n\s*}\s*(?=\n\s*[}\w])/g;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original.replace(flatDirBlock, '\n');

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Removed flatDir from ${path.relative(projectRoot, filePath)}`);
  }
}

