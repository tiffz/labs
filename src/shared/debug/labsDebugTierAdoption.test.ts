import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADR 0026 migration, made permanent.
 *
 * `readLabsDebugFromLocation().debug` is the RAW query flag: true for anyone who types `?debug` on
 * production. The tiered helpers (`isLabsDebugVisible` / `isLabsDebugFull`) additionally require
 * localhost or the signed-in owner before granting the `full` tier.
 *
 * Scales was the last app gating on the raw flag, which let an anonymous production `?debug` reach
 * "complete exercise perfectly" — a control that dispatches a full set of perfect results and
 * finishes the exercise, mutating practice progress. #120 migrated every other app; this closes it.
 *
 * A source scan, and it says so. The set is DERIVED — every app file is walked, so a new app is
 * enrolled by existing rather than by someone remembering to add it here.
 *
 * `.overlay` is a different query param (a visual overlay, no mutation) and is not covered.
 */
const SRC = path.join(process.cwd(), 'src');

/** Gating on the raw `debug` field, by property access or by destructuring the call result. */
const RAW_DEBUG_GATE = [
  /readLabsDebugFromLocation\(\)\s*\.\s*debug/,
  /\{[^}]*\bdebug\b[^}]*\}\s*=\s*readLabsDebugFromLocation\(\)/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
}

describe('tiered debug access is adopted everywhere', () => {
  const files = walk(SRC).filter((file) => {
    const rel = path.relative(SRC, file);
    // The helper module itself defines the raw reader; the generated catalog only names it.
    if (rel.startsWith(`shared${path.sep}debug${path.sep}`)) return false;
    if (rel === `shared${path.sep}utils${path.sep}readLabsDebugParams.ts`) return false;
    if (rel === `ui${path.sep}generatedSharedCatalog.ts`) return false;
    return true;
  });

  it('walks the app tree it governs', () => {
    // A glob that matches nothing passes every assertion below.
    expect(files.length).toBeGreaterThan(200);
  });

  it('no app gates behaviour on the raw ?debug flag', () => {
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return RAW_DEBUG_GATE.some((re) => re.test(source));
    });
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
