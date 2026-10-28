/**
 * The Vitest files that govern app code from outside the app, and so must run on every scoped
 * (app-only) test run.
 *
 * Import boundaries forbid `src/shared/**` from importing an app, so the only way a shared test can
 * see app code is to read it off disk. That makes the set derivable: every shared test that touches
 * the filesystem (`node:fs` or `import.meta.glob`). A new source-scanning guard is enrolled by
 * existing; nobody has to remember to add it to a list.
 *
 * Before this, the list was three hand-picked files. `sidecarBatchTolerance.test.ts` walks `src/**`
 * for Drive downloaders but was not on it, so #287 shipped an unguarded Lyrefly downloader on an
 * app-only PR with CI green, and the guard only failed later in unrelated pre-commit hooks.
 */
import fs from 'node:fs';
import path from 'node:path';

const READS_DISK = /from\s+['"](?:node:)?fs(?:\/promises)?['"]|require\(\s*['"](?:node:)?fs['"]\s*\)|import\.meta\.glob/;

/**
 * Slow by convention (see `vite.config.ts` FAST_TESTS exclude). These read audio fixtures, not app
 * code, and CI's scoped run does not set FAST_TESTS, so they would otherwise run on every app PR.
 */
const SLOW_BY_NAME = /(regression|audit|stress|benchmark|\.integration)\b|(Regression|Audit|Stress|Benchmark)/;

const SCANNED_ROOTS = ['src/shared'];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.test\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Repo-relative paths, sorted. */
export function listRepoWideGuardTests(repoRoot = process.cwd()) {
  const files = [];
  for (const root of SCANNED_ROOTS) walk(path.join(repoRoot, root), files);
  return files
    .map((file) => path.relative(repoRoot, file).split(path.sep).join('/'))
    .filter((rel) => !SLOW_BY_NAME.test(path.basename(rel)))
    .filter((rel) => READS_DISK.test(fs.readFileSync(path.join(repoRoot, rel), 'utf8')))
    .sort();
}
