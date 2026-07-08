/* global process */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const targets = [
  path.join(projectRoot, 'android', 'app', 'build.gradle'),
  path.join(projectRoot, 'android', 'capacitor-cordova-android-plugins', 'build.gradle'),
];

const flatDirBlock = /\n\s*flatDir\s*\{[\s\S]*?\n\s*}\s*(?=\n\s*[}\w])/g;

const updaterGradleFiles = [
  path.join(projectRoot, 'android', 'capacitor.settings.gradle'),
  path.join(projectRoot, 'android', 'app', 'capacitor.build.gradle'),
];

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

for (const filePath of updaterGradleFiles) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = original
    .replace(/\ninclude ':capacitor-updater'\nproject\(':capacitor-updater'\)\.projectDir = new File\('\.\.\/node_modules\/capacitor-updater\/android'\)\n?/g, '\n')
    .replace(/\n\s*implementation project\(':capacitor-updater'\)\n?/g, '\n');

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`Disabled legacy capacitor-updater Android plugin in ${path.relative(projectRoot, filePath)}`);
  }
}
