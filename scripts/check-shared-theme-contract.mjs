import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// ---------------------------------------------------------------------------
// 1. Shared component CSS must consume the shared tokens (not hardcode values).
// ---------------------------------------------------------------------------

const checks = [
  {
    file: 'src/shared/components/music/appSharedThemes.css',
    required: [
      '--space-1',
      '--theme-primary',
      '--control-height-comfortable',
      '--labs-popover-shadow',
      '--labs-control-hover-shadow',
    ],
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

// ---------------------------------------------------------------------------
// 2. Every app entry must import the shared theme base so shared components
//    render correctly, unless it is a documented exception.
// ---------------------------------------------------------------------------

/** Apps whose primary theming intentionally diverges from the shared CSS token
 *  stack. They still import appSharedThemes.css for shared components; listing
 *  here only exempts them from the palette-completeness check below.
 *  Divergence must be documented in the app's DESIGN.md. */
const THEME_STACK_EXCEPTIONS = new Map([
  ['gesture', 'Linen design system (src/gesture/DESIGN.md)'],
  ['encore', 'MUI theme via getAppTheme() (src/encore/AGENTS.md)'],
  ['scales', 'MUI theme via getAppTheme()'],
  ['zinebox', 'MUI-based library chrome (src/zinebox/AGENTS.md)'],
]);

const appDirs = fs
  .readdirSync(path.join(root, 'src'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(root, 'src', name, 'index.html')));

for (const app of appDirs) {
  const mainPath = path.join(root, 'src', app, 'main.tsx');
  if (!fs.existsSync(mainPath)) continue;
  const main = fs.readFileSync(mainPath, 'utf8');
  if (!main.includes('appSharedThemes.css')) {
    failures.push(
      `src/${app}/main.tsx must import appSharedThemes.css (shared component theming base) or document an exception in check-shared-theme-contract.mjs`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Palette completeness: an app that overrides --theme-primary must override
//    the full core set, so shared components never render a mismatched hybrid
//    (custom primary on default purple focus ring, etc.).
// ---------------------------------------------------------------------------

const CORE_PALETTE_TOKENS = [
  '--theme-primary:',
  '--theme-primary-hover:',
  '--theme-bg:',
  '--theme-surface:',
  '--theme-text:',
  '--theme-text-secondary:',
  '--theme-border:',
  '--theme-focus-ring:',
];

function collectCssFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectCssFiles(abs));
    else if (entry.name.endsWith('.css')) out.push(abs);
  }
  return out;
}

for (const app of appDirs) {
  if (THEME_STACK_EXCEPTIONS.has(app)) continue;
  const cssFiles = collectCssFiles(path.join(root, 'src', app));
  const combined = cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  if (!combined.includes('--theme-primary:')) continue; // inherits shared default palette
  for (const token of CORE_PALETTE_TOKENS) {
    if (!combined.includes(token)) {
      failures.push(
        `src/${app} overrides --theme-primary but not ${token.slice(0, -1)} — override the full core palette (see appSharedThemes.css) or remove the partial override`,
      );
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

console.log(
  `Shared theme contract check passed (${appDirs.length} app shells, ${THEME_STACK_EXCEPTIONS.size} documented exceptions).`,
);
