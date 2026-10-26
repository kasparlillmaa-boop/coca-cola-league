'use strict';

// `npm run build`: there is nothing to compile, so this checks that every
// source file parses and that the app can be assembled without a database.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const files = ['src', 'scripts', 'test'].flatMap((dir) => jsFiles(path.join(root, dir)));
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

const { createApp } = require('../src/app');
const { MemoryStore } = require('../src/store/memory');
createApp({ store: new MemoryStore(), demo: true });

for (const asset of ['public/styles.css', 'public/favicon.svg']) {
  if (!fs.existsSync(path.join(root, asset))) throw new Error(`Missing ${asset}`);
}

console.log(`Build check passed: ${files.length} files parsed, app assembled.`);
