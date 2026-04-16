/* global process */
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const androidPublicAssetsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public', 'assets');

const targets = [
  path.join(projectRoot, 'android', 'app', 'build.gradle'),
  path.join(projectRoot, 'android', 'capacitor-cordova-android-plugins', 'build.gradle'),
];

const flatDirBlock = /\n\s*flatDir\s*\{[\s\S]*?\n\s*}\s*(?=\n\s*[}\w])/g;
const viewportReplacement = {
  from: '100vh',
  to: '100dvh',
};
const requiredTokens = ['100dvh', 'safe-area-inset-top', 'safe-area-inset-bottom'];

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

/*
if (fs.existsSync(androidPublicAssetsDir)) {
  const bundleFiles = fs.readdirSync(androidPublicAssetsDir)
    .filter((name) => name.startsWith('index-') && name.endsWith('.js'));

  for (const bundleFileName of bundleFiles) {
    const bundleFilePath = path.join(androidPublicAssetsDir, bundleFileName);
    const original = fs.readFileSync(bundleFilePath, 'utf8');
    const matches = original.match(/100vh/g) ?? [];
    const updated = original.replaceAll(viewportReplacement.from, viewportReplacement.to);

    if (updated !== original) {
      fs.writeFileSync(bundleFilePath, updated, 'utf8');
      console.log(`Patched ${matches.length} viewport token(s) in ${path.relative(projectRoot, bundleFilePath)}`);
    }

    const finalContent = updated === original ? original : updated;
    const missingTokens = requiredTokens.filter((token) => !finalContent.includes(token));

    if (missingTokens.length > 0) {
      console.warn(`[Warning] Bundle ${bundleFileName} is missing: ${missingTokens.join(', ')}`);
    }

    console.log(`Validated viewport/safe-area tokens in ${path.relative(projectRoot, bundleFilePath)}`);
  }
}
*/

