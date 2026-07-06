import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const pickerFiles = [
  'src/shared/components/music/BpmInput.tsx',
  'src/shared/components/music/KeyInputPicker.tsx',
  'src/shared/components/music/PlaybackSoundSelect.tsx',
  'src/shared/components/music/ChordProgressionInput.tsx',
  'src/shared/components/music/ChordStyleInput.tsx',
  'src/shared/components/music/TimeSignatureInput.tsx',
  'src/shared/components/music/PlaybackSpeedControl.tsx',
  'src/chords/App.tsx',
  'src/midi/components/MidiOptionSelect.tsx',
];

for (const relPath of pickerFiles) {
  const text = fs.readFileSync(path.join(root, relPath), 'utf8');
  if (text.includes('disableEnforceFocus') || text.includes('disableRestoreFocus') || text.includes('disableAutoFocus')) {
    failures.push(
      `${relPath} must not disable MUI popover focus management (see docs/A11Y_MENU_PATTERNS.md)`,
    );
  }
}

if (!fs.existsSync(path.join(root, 'docs/A11Y_MENU_PATTERNS.md'))) {
  failures.push('docs/A11Y_MENU_PATTERNS.md is missing');
}

if (!fs.existsSync(path.join(root, 'docs/FOCUS_THEMING.md'))) {
  failures.push('docs/FOCUS_THEMING.md is missing');
}

const metroControlCssPath = path.join(root, 'src/shared/audio/platform/styles/metronome-control.css');
if (fs.existsSync(metroControlCssPath)) {
  const metroCss = fs.readFileSync(metroControlCssPath, 'utf8');
  if (/\.labs-split-action-button\s*\{[^}]*\boverflow:\s*hidden\b/.test(metroCss)) {
    failures.push(
      'metronome-control.css: .labs-split-action-button must not use overflow:hidden (clip on __half instead; see docs/A11Y_MENU_PATTERNS.md)',
    );
  }
  if (/\.labs-metronome-settings-popover\s*\{[^}]*\boverflow:\s*hidden\b/.test(metroCss)) {
    failures.push(
      'metronome-control.css: .labs-metronome-settings-popover must not use overflow:hidden (clips toggle focus rings)',
    );
  }
}

const splitControlPath = path.join(
  root,
  'src/shared/audio/platform/metronome/components/MetronomeSplitControl.tsx',
);
if (fs.existsSync(splitControlPath)) {
  const splitControl = fs.readFileSync(splitControlPath, 'utf8');
  if (!splitControl.includes('labs-focus-ring-host')) {
    failures.push('MetronomeSplitControl must wrap split control with labs-focus-ring-host');
  }
}

if (failures.length > 0) {
  console.error('Menu a11y contract check failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Menu a11y contract check passed.');
