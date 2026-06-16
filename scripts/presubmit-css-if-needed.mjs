#!/usr/bin/env node
/**
 * Run vite build when CSS files changed (staged or vs HEAD).
 * PostCSS parse errors are not covered by eslint/typecheck.
 */
import { execSync } from 'node:child_process';

function listCss(pathsCommand) {
  try {
    return execSync(pathsCommand, { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('.css'));
  } catch {
    return [];
  }
}

const cssFiles = [
  ...new Set([
    ...listCss('git diff --cached --name-only'),
    ...listCss('git diff --name-only HEAD'),
    ...listCss('git ls-files --others --exclude-standard'),
  ]),
];

if (cssFiles.length === 0) {
  console.log('presubmit-css: no CSS changes; skipping build');
  process.exit(0);
}

console.log(`presubmit-css: ${cssFiles.length} CSS file(s) changed — running vite build`);
execSync('npm run build', { stdio: 'inherit' });
