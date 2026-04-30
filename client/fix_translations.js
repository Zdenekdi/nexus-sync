import fs from 'fs';

const filePath = './src/translations.js';
let content = fs.readFileSync(filePath, 'utf-8');

// A very naive script won't work well for this complex JS file.
// Let's just output the linting errors for translations.js first so I can see what's wrong.
