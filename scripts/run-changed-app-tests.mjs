#!/usr/bin/env node
/**
 * Run Vitest for apps touched in git diff vs merge base.
 * Usage: npm run test:changed-apps [-- base-ref]
 */
import { execSync } from 'node:child_process';

function gitRef(base) {
  if (base) return base;
  try {
    execSync('git rev-parse --verify origin/main', { stdio: 'ignore' });
    return 'origin/main';
  } catch {
    return 'HEAD~1';
  }
}

function changedFiles(baseRef) {
  try {
    return execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return execSync(`git diff --name-only ${baseRef} HEAD`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
}

const baseRef = gitRef(process.argv[2]);
const files = changedFiles(baseRef);

const apps = new Set();
let shared = false;
for (const f of files) {
  if (f.startsWith('src/shared/')) shared = true;
  const m = f.match(/^src\/([^/]+)\//);
  if (m && m[1] !== 'shared') apps.add(m[1]);
}

if (shared || apps.size === 0 || apps.size > 3) {
  console.log('test:changed-apps: running test:fast (shared or broad diff)');
  execSync('npm run test:fast', { stdio: 'inherit' });
  process.exit(0);
}

for (const app of apps) {
  console.log(`test:changed-apps: vitest src/${app}`);
  execSync(`npx vitest run "src/${app}"`, { stdio: 'inherit' });
}

console.log('test:changed-apps: ok');
