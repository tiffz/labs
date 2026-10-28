import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Where a measure sits, and whether the score hides it, is computed in ONE place:
 * `measureLayout.ts`, on top of the repeat arithmetic in `sectionRepeatSpan.ts`.
 *
 * The darbuka editor once had nine copies of that rule — parser, renderer, tick lookups, selection,
 * player, sequencer, simile expansion — and they disagreed. Each disagreement was a user-visible
 * bug: a note highlighted in two sections, edits landing a measure early, `x2` playing three
 * times, a sequencer click editing measure 2 when you clicked measure 6. Fixing one copy left the
 * others broken, so the owner reported the same class of bug again.
 *
 * This guard stops a tenth copy. It walks every source file — a new one is checked by existing,
 * not by someone remembering to list it — and fails if code outside the allowed files imports the
 * repeat arithmetic or redoes it inline. Code that needs to know about measures asks
 * `measureLayoutOf(parsed)`.
 */

const SRC = join(__dirname, '..', '..');

/** Files that may use the repeat arithmetic, each with the reason it needs to. */
const ALLOWED: Record<string, string> = {
  'shared/rhythm/sectionRepeatSpan.ts': 'defines the arithmetic',
  'shared/rhythm/measureLayout.ts': 'builds the one layout everything else reads',
  'shared/rhythm/rhythmParser.ts': 'produces the repeats the layout is built from',
};

/** Importing the arithmetic, or doing it inline on a repeat count. */
const IMPORTS_ARITHMETIC = /from\s+['"][^'"]*sectionRepeatSpan['"]/;
const INLINE_ARITHMETIC = /repeatCount\s*[-+]\s*1\b|\*\s*\(?\s*\w*\.?repeatCount\b/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules') out.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !/^generated/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

/** Code only: comments may describe the old arithmetic, and several do, to explain the bug. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('measure layout has one source of truth', () => {
  const files = sourceFiles(SRC).map((path) => ({
    rel: relative(SRC, path).split('\\').join('/'),
    code: stripComments(readFileSync(path, 'utf8')),
  }));

  it('finds the source tree and the files it protects', () => {
    // A walk that matched nothing would pass every assertion below.
    expect(files.length).toBeGreaterThan(500);
    for (const rel of Object.keys(ALLOWED)) {
      expect(files.some((f) => f.rel === rel), `${rel} moved; update ALLOWED`).toBe(true);
    }
    expect(files.find((f) => f.rel === 'shared/rhythm/measureLayout.ts')?.code).toMatch(/export function buildMeasureLayout/);
  });

  it('nothing outside the layout imports the repeat arithmetic or redoes it', () => {
    const offenders = files
      .filter((f) => !(f.rel in ALLOWED))
      .flatMap((f) => [
        ...(IMPORTS_ARITHMETIC.test(f.code) ? [`${f.rel}: imports sectionRepeatSpan`] : []),
        ...(INLINE_ARITHMETIC.test(f.code) ? [`${f.rel}: does repeat-count arithmetic inline`] : []),
      ]);
    expect(offenders, 'Ask measureLayoutOf(parsed) instead — see src/drums/DEVELOPMENT.md').toEqual([]);
  });
});
