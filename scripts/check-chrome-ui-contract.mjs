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
  'src/shared/components/music/appSharedThemes.css',
  'src/shared/components/AnchoredPopover.tsx',
  'docs/CHROME_UI_CONTRACT.md',
  'docs/FOCUS_THEMING.md',
  'src/words/main.tsx',
];

/** Playback apps that must import labsChrome.css (see CHROME_UI_CONTRACT.md rollout). */
const playbackAppsRequiringChrome = [
  'src/words/main.tsx',
  'src/drums/main.tsx',
  'src/chords/main.tsx',
  'src/stanza/main.tsx',
  'src/piano/main.tsx',
  'src/midi/main.tsx',
  'src/scales/main.tsx',
];

/** Content apps with heavy floating UI — same chrome imports as playback apps. */
const contentAppsRequiringChrome = ['src/encore/main.tsx'];

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

requireIncludes('src/shared/styles/labsChrome.css', ['.labs-popover-surface', '.labs-btn', '.labs-focus-ring-host', '.labs-focus-inset'], 'labsChrome.css');
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

const wordsMain = read('src/words/main.tsx');
if (!wordsMain.includes("import '../shared/styles/labsChrome.css'")) {
  failures.push('src/words/main.tsx must import labsChrome.css (reference app migration)');
}

for (const relPath of [...playbackAppsRequiringChrome, ...contentAppsRequiringChrome]) {
  if (!fs.existsSync(path.join(root, relPath))) {
    failures.push(`${relPath} is missing (playback chrome rollout)`);
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

if (failures.length > 0) {
  console.error('Chrome UI contract check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Chrome UI contract check passed.');
