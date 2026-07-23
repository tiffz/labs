import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import baseline from './componentSizeBaseline.json';

/**
 * Per-file size ratchet — the Wave-1 flagship from the 2026-07 quality tournament
 * (docs/QUALITY_TOURNAMENT_2026-07.md, tech-debt #2). The 600-line decomposition
 * standard (docs/COMPONENT_DECOMPOSITION_PATTERN.md) had NO enforcement, so its own
 * pilot (StanzaWorkspace) sat at 3k lines and oversized files monotonically regrew.
 *
 * This freezes today's ceilings: a **new** source file must be <= THRESHOLD lines,
 * and a currently-oversized file (in the baseline) may only **shrink**, never grow.
 * Decomposition becomes mechanically unavoidable instead of opt-in. Same monotonic
 * shape as `sharedModuleCycles.test.ts` / jscpd ratchet — update the baseline DOWN
 * (never up) as files are split. Generated data files are exempt.
 */
const THRESHOLD = 600;
const REPO_ROOT = resolve(__dirname, '../..');
const SRC = join(REPO_ROOT, 'src');
// Group the unanchored substring matches so the `$` clearly binds to `.d.ts` only
// (js/regex/missing-regexp-anchor): exempt any path containing one of the substrings,
// or ending in `.d.ts`.
const EXEMPT = /(?:\.test\.|\.stories\.|generatedSharedCatalog|atlasMeshRegistry)|\.d\.ts$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function lineCount(file: string): number {
  return readFileSync(file, 'utf8').split('\n').length;
}

const sizes = new Map<string, number>();
for (const abs of walk(SRC)) {
  const rel = abs.slice(REPO_ROOT.length + 1);
  if (EXEMPT.test(rel)) continue;
  sizes.set(rel, lineCount(abs));
}
const base = baseline as Record<string, number>;

describe('per-file size ratchet', () => {
  it('no NEW source file exceeds the 600-line decomposition threshold', () => {
    const offenders = [...sizes.entries()]
      .filter(([rel, n]) => n > THRESHOLD && !(rel in base))
      .map(([rel, n]) => `${rel} (${n} lines)`);
    expect(
      offenders,
      `New file(s) over ${THRESHOLD} lines. Decompose (COMPONENT_DECOMPOSITION_PATTERN.md), ` +
        `do NOT add to componentSizeBaseline.json:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('baselined oversized files only shrink, never grow', () => {
    const grew = Object.entries(base)
      .filter(([rel, was]) => sizes.has(rel) && (sizes.get(rel) as number) > was)
      .map(([rel, was]) => `${rel}: ${was} -> ${sizes.get(rel)} (must not grow)`);
    expect(grew, `Oversized file(s) grew:\n  ${grew.join('\n  ')}`).toEqual([]);
  });

  it('baseline stays honest: no entry that has dropped to/under threshold or been removed', () => {
    // Keeps the baseline shrinking. If a file split below THRESHOLD (or was deleted),
    // remove its row so it re-enters the hard cap in test 1.
    const stale = Object.keys(base).filter(
      (rel) => !sizes.has(rel) || (sizes.get(rel) as number) <= THRESHOLD,
    );
    expect(
      stale,
      `Baseline rows no longer needed (file split below ${THRESHOLD} or removed) — delete them ` +
        `from componentSizeBaseline.json:\n  ${stale.join('\n  ')}`,
    ).toEqual([]);
  });
});
