import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const failures = [];

const shellChromeRules = [
  {
    file: 'src/shared/components/music/bpmInput.css',
    forbiddenOnShell: ['.shared-bpm-dropdown'],
    forbiddenProps: ['box-shadow:', 'border-radius: 0.82rem'],
  },
  {
    file: 'src/shared/components/music/keyInput.css',
    forbiddenOnShell: ['.shared-key-dropdown'],
    forbiddenProps: ['box-shadow:', 'border-radius: 0.82rem'],
  },
  {
    file: 'src/shared/components/music/chordProgressionInput.css',
    forbiddenOnShell: ['.shared-chord-progression-dropdown'],
    forbiddenProps: ['box-shadow:', 'border: 1px solid'],
  },
  {
    file: 'src/shared/components/music/playbackFieldSelect.css',
    forbiddenOnShell: ['.shared-playback-field-select__menu'],
    forbiddenProps: ['box-shadow:', 'border: 1px solid', 'border-radius:'],
  },
  {
    file: 'src/encore/styles/encore.css',
    forbiddenOnShell: ['.encore-repertoire-floating-menu'],
    forbiddenProps: ['box-shadow:', 'border: 1px solid', 'background: rgba(255'],
  },
];

const contractFiles = [
  'src/shared/styles/labsChrome.css',
  'src/shared/styles/labsChromeAppShells.css',
  'src/shared/components/music/appSharedThemes.css',
  'src/shared/components/AnchoredPopover.tsx',
  'docs/CHROME_UI_CONTRACT.md',
  'docs/FOCUS_THEMING.md',
  'src/words/main.tsx',
];

/** All micro-apps must import chrome contract CSS (see CHROME_UI_CONTRACT.md rollout). */
const allAppsRequiringChrome = [
  'src/words/main.tsx',
  'src/drums/main.tsx',
  'src/chords/main.tsx',
  'src/encore/main.tsx',
  'src/stanza/main.tsx',
  'src/piano/main.tsx',
  'src/midi/main.tsx',
  'src/scales/main.tsx',
  'src/pitch/main.tsx',
  'src/ui/main.tsx',
  'src/melodia/main.tsx',
  'src/gesture/main.tsx',
  'src/muscle/main.tsx',
  'src/zinebox/main.tsx',
  'src/sight/main.tsx',
  'src/count/main.tsx',
  'src/cats/main.tsx',
  'src/agility/main.tsx',
  'src/corp/main.tsx',
  'src/forms/main.tsx',
  'src/story/main.tsx',
  'src/zines/main.tsx',
];

const RAW_POPOVER_IMPORT = /^import Popover from '@mui\/material\/Popover';/;

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function requireIncludes(relPath, needles, label) {
  const text = read(relPath);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures.push(`${label ?? relPath} missing: ${needle}`);
    }
  }
}

requireIncludes('src/shared/styles/labsChrome.css', ['.labs-popover-surface', '.labs-btn', '.labs-focus-ring-host', '.labs-focus-inset', 'labsChromeAppShells.css'], 'labsChrome.css');
requireIncludes(
  'src/shared/styles/labsChromeAppShells.css',
  ['.midi-root', '.gesture-app', '.pulse-app'],
  'labsChromeAppShells.css',
);
requireIncludes(
  'src/shared/components/music/appSharedThemes.css',
  [
    '--labs-popover-border',
    '--labs-popover-shadow',
    '--labs-control-transition',
    '--labs-control-hover-shadow',
    '--theme-shadow-popover',
    '--labs-control-focus-ring',
    '--labs-control-focus-ring-inset',
    '--labs-focus-ring-bleed',
  ],
  'appSharedThemes.css',
);
requireIncludes(
  'src/shared/components/AnchoredPopover.tsx',
  ['labs-popover-surface'],
  'AnchoredPopover.tsx',
);

for (const relPath of contractFiles) {
  if (!fs.existsSync(path.join(root, relPath))) {
    failures.push(`${relPath} is missing`);
  }
}

for (const relPath of allAppsRequiringChrome) {
  if (!fs.existsSync(path.join(root, relPath))) {
    failures.push(`${relPath} is missing (chrome rollout)`);
    continue;
  }
  const mainText = read(relPath);
  if (!mainText.includes("import '../shared/styles/labsChrome.css'")) {
    failures.push(`${relPath} must import labsChrome.css`);
  }
  if (!mainText.includes('appSharedThemes.css')) {
    failures.push(`${relPath} must import appSharedThemes.css`);
  }
}

for (const rule of shellChromeRules) {
  const text = read(rule.file);
  for (const selector of rule.forbiddenOnShell) {
    const selectorIndex = text.indexOf(`${selector} {`);
    if (selectorIndex === -1) continue;
    const blockStart = selectorIndex + selector.length;
    const blockEnd = text.indexOf('\n}', blockStart);
    const block = blockEnd === -1 ? text.slice(blockStart) : text.slice(blockStart, blockEnd);
    for (const prop of rule.forbiddenProps) {
      if (block.includes(prop)) {
        failures.push(`${rule.file} ${selector} must not set shell chrome (${prop}) — use .labs-popover-surface`);
      }
    }
  }
}

function walkSourceFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'shared' || ent.name === 'node_modules') continue;
      walkSourceFiles(abs, out);
      continue;
    }
    if (/\.(tsx|ts)$/.test(ent.name)) out.push(abs);
  }
  return out;
}

for (const absPath of walkSourceFiles(path.join(root, 'src'))) {
  const relPath = path.relative(root, absPath).replaceAll('\\', '/');
  const lines = read(relPath).split('\n');
  for (const line of lines) {
    if (RAW_POPOVER_IMPORT.test(line.trim())) {
      failures.push(`${relPath} must use AnchoredPopover — raw MUI Popover import is app-local only in src/shared/`);
      break;
    }
  }
}

if (failures.length > 0) {
  console.error('Chrome UI contract check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Chrome UI contract check passed.');
