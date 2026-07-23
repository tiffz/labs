import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import baseline from './componentSizeBaseline.json';

/**
 * Per-file size guard. The 600-line decomposition standard
 * (docs/COMPONENT_DECOMPOSITION_PATTERN.md) had NO enforcement, so oversized files
 * monotonically regrew.
 *
 * **Two-part policy (advisory per-file, hard for new files):**
 * - **HARD:** a **new** source file must be <= THRESHOLD lines — prevents new god-files.
 * - **ADVISORY:** growth of already-baselined oversized files is *reported, not blocked*.
 *   A raw per-file line freeze taxed legitimate growth (a P0 data-loss fix was blocked by it)
 *   and rewarded artificial splits (extract-a-helper-just-to-pass hurts leanness). Line count
 *   is a poor proxy for complexity; per-unit complexity + the no-new-god-file gate are the real
 *   leanness signals. The baseline is now a watch-list, not a freeze. (Owner decision 2026-07-23;
 *   the follow-up is complexity/function-length lint rules — see PROCESS_BACKLOG.)
 * Generated data files are exempt.
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

  it('reports growth/shrinkage of baselined oversized files (ADVISORY — never fails)', () => {
    const grew = Object.entries(base)
      .filter(([rel, was]) => sizes.has(rel) && (sizes.get(rel) as number) > was)
      .map(([rel, was]) => `${rel}: ${was} -> ${sizes.get(rel)}`);
    const nowUnderThreshold = Object.keys(base).filter(
      (rel) => !sizes.has(rel) || (sizes.get(rel) as number) <= THRESHOLD,
    );
    if (grew.length > 0) {
      console.warn(
        `[size-advisory] baselined oversized files grew (decompose when practical; not blocking):\n  ${grew.join('\n  ')}`,
      );
    }
    if (nowUnderThreshold.length > 0) {
      console.warn(
        `[size-advisory] baselined files now <= ${THRESHOLD} — trim componentSizeBaseline.json:\n  ${nowUnderThreshold.join('\n  ')}`,
      );
    }
    // Non-blocking by design: the only hard size gate is the NEW-file cap above.
    expect(Array.isArray(grew)).toBe(true);
  });
});
