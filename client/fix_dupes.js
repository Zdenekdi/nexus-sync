import fs from 'fs';

const filePath = './src/translations.js';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

let currentLocale = null;
const seenKeys = new Set();
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Match locale block start like "    en: {" or "    cz: {"
  const localeMatch = line.match(/^ {4}([a-z]{2}):\s*\{/);
  if (localeMatch) {
    currentLocale = localeMatch[1];
    seenKeys.clear();
    newLines.push(line);
    continue;
  }
  
  // Match key-value pair like "        keyName: 'value',"
  // The key can be without quotes or with quotes, but in our file it's mostly without quotes
  const keyMatch = line.match(/^ {8}([a-zA-Z0-9_]+):\s*(['"`])/);
  if (currentLocale && keyMatch) {
    const key = keyMatch[1];
    if (seenKeys.has(key)) {
      console.log(`Removing duplicate key '${key}' in locale '${currentLocale}' at line ${i + 1}`);
      // Skip this line
      continue;
    } else {
      seenKeys.add(key);
      newLines.push(line);
    }
  } else {
    // Other lines (comments, nested objects like manual: { ... })
    // If it starts a nested object, we might need to handle it, but for our duplicates it's mostly top-level keys
    newLines.push(line);
  }
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('Done cleaning duplicates.');
