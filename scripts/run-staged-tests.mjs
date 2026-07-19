#!/usr/bin/env node
/**
 * Run Vitest scoped to git **staged** files (Husky pre-commit).
 * Mirrors CI path scoping — narrow app edits run one app; shared/tooling runs test:fast.
 *
 * Usage: npm run test:staged
 */
import { execSync } from 'node:child_process';

function stagedFiles() {
  return execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function firstMatch(files, pattern) {
  const re = new RegExp(pattern);
  return files.find((f) => re.test(f));
}

function run(cmd, env = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, FAST_TESTS: 'true', ...env },
  });
}

const files = stagedFiles();
if (files.length === 0) {
  console.log('test:staged: no staged files');
  process.exit(0);
}

const BPM_BENCHMARK_PATTERN =
  '^src/shared/beat/(bpmDetectionBenchmark\\.test\\.ts|regression/tempoDetectorInterface\\.ts|regression/tempoDetectors\\.ts|regression/tempoDetectorCore\\.ts|tempoEnsemble\\.ts|regression/syntheticAudioGenerator\\.ts|bpmAccuracyTest\\.ts)$';

const BEAT_SCOPE_PATTERN = '^src/shared/beat/';
const REGRESSION_PATTERN = '\\.regression\\.test\\.(ts|tsx)$|^src/cats/';

const CROSS_CUTTING_PATTERN =
  '^(src/shared/|vite\\.config|vitest\\.config|package\\.json|package-lock\\.json|scripts/|\\.github/workflows/|eslint\\.config|tsconfig)';

if (firstMatch(files, BPM_BENCHMARK_PATTERN)) {
  console.log('test:staged: BPM benchmark files — full beat suite');
  run('npm test', { INCLUDE_BEAT_BENCHMARK: 'true', FAST_TESTS: '' });
  process.exit(0);
}

if (firstMatch(files, REGRESSION_PATTERN)) {
  console.log('test:staged: regression/cat files — full Vitest');
  run('npm test', { FAST_TESTS: '' });
  process.exit(0);
}

const sharedTouched = files.some((f) => f.startsWith('src/shared/'));
const crossCutting = files.some((f) => new RegExp(CROSS_CUTTING_PATTERN).test(f));
const beatTouched = firstMatch(files, BEAT_SCOPE_PATTERN);

const apps = new Set();
for (const f of files) {
  const m = f.match(/^src\/([^/]+)\//);
  if (m && m[1] !== 'shared') apps.add(m[1]);
}

if (beatTouched && !crossCutting && apps.size === 0) {
  console.log('test:staged: beat files only — beat folder (+ integration tests)');
  run('npx vitest run src/shared/beat', { RUN_INTEGRATION_TESTS: 'true' });
  process.exit(0);
}

if (crossCutting || sharedTouched || apps.size === 0 || apps.size > 3) {
  console.log('test:staged: shared or broad diff — test:fast');
  run('npm run test:fast');
  process.exit(0);
}

for (const app of apps) {
  console.log(`test:staged: vitest src/${app}`);
  // --passWithNoTests: some app dirs are data/manifest-only (e.g. labsHome)
  run(`npx vitest run --passWithNoTests "src/${app}"`);
}

console.log('test:staged: ok');
