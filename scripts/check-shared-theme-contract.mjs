import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'src/shared/components/music/appSharedThemes.css',
    required: ['--space-1', '--theme-primary', '--control-height-comfortable'],
  },
  {
    file: 'src/shared/components/music/bpmInput.css',
    required: ['--control-height', '--theme-surface', '--theme-primary'],
  },
  {
    file: 'src/shared/components/music/keyInput.css',
    required: ['--control-height', '--theme-border', '--theme-shadow-lg'],
  },
  {
    file: 'src/shared/components/music/chordProgressionInput.css',
    required: ['--control-height', '--theme-primary', '--theme-focus-ring'],
  },
  {
    file: 'src/shared/components/music/chordStyleInput.css',
    required: ['--control-height', '--theme-primary', '--theme-focus-ring'],
  },
];

const failures = [];

for (const check of checks) {
  const abs = path.join(root, check.file);
  const text = fs.readFileSync(abs, 'utf8');
  for (const needle of check.required) {
    if (!text.includes(needle)) {
      failures.push(`${check.file} missing token reference: ${needle}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Shared theme contract check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Shared theme contract check passed.');
