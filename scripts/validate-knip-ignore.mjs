#!/usr/bin/env node
/**
 * Ensure every knip.config.ts ignore[] entry has a documenting comment on the line above.
 * Usage: npm run check:knip-config
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(ROOT, 'knip.config.ts');
const lines = fs.readFileSync(configPath, 'utf8').split('\n');

let inIgnore = false;
const violations = [];

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (line.includes('ignore: [')) {
    inIgnore = true;
    continue;
  }
  if (inIgnore && line.trim() === '],') {
    break;
  }
  if (!inIgnore) continue;

  const entryMatch = line.match(/^\s*'([^']+)'/);
  if (!entryMatch) continue;

  const prev = lines[i - 1]?.trim() ?? '';
  if (!prev.startsWith('//')) {
    violations.push(`knip ignore entry "${entryMatch[1]}" at line ${i + 1} needs a // comment above it`);
  }
}

if (violations.length > 0) {
  console.error('check:knip-config failed:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('check:knip-config: ok');
