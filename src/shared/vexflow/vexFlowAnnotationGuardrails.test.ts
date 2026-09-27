import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Text drawn onto a VexFlow score must go through `vexFlowAnnotation`.
 *
 * Two faults keep recurring, and neither is visible in review because the code
 * reads as if it does the right thing:
 *
 * 1. A hardcoded font stack. VexFlow sets Bravura on the `<svg>`, so authors
 *    override it — with a family the app does not use. Maqam Playground shipped
 *    jins labels in Inter on a page set in Roboto.
 * 2. A px size written into user units. `SVGContext.scale` shrinks the viewBox
 *    against a fixed width, so `font-size: 11` renders at 11 × the live scale.
 *    Maqam's 11px label drew at 19.5px.
 *
 * The set is DERIVED — every source file that imports VexFlow — rather than a
 * list someone has to remember to extend. A new renderer is enrolled by
 * importing VexFlow, which it cannot avoid doing.
 */
const REPO_ROOT = path.resolve(__dirname, '../../..');

/* A plain tree walk, matching `vexFlowMusicFontGateGuardrails` next door —
   node's own `fs` rather than a glob dependency this package does not declare. */
function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') listSourceFiles(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Files that draw with VexFlow. Derived, not enumerated. */
function vexFlowSourceFiles(): string[] {
  return listSourceFiles(path.join(REPO_ROOT, 'src'))
    .filter((file) => /from 'vexflow'|from "vexflow"/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(REPO_ROOT, file))
    .sort();
}

/**
 * Files that already had both faults when this guard was written, 2026-09-26.
 *
 * Exempt by NAME, with a reason, so the default stays "must comply" — an
 * allowlist of inclusions would invert that and let the next renderer opt out
 * by simply not being added.
 *
 * All six do the same two things, roughly ten times between them: hand-build a
 * `<text>` and assign a literal family. Three of them assign `'Arial'` inside
 * apps themed in Roboto, which is the bug this guard exists for, shipped and
 * live. They are not migrated here because they render Drums, Chords, Words
 * and the shared ScoreDisplay — a mechanical ten-site change across four apps
 * does not belong in the same commit as a visual redesign of a fifth, where a
 * regression in any of them would be attributed to the wrong work.
 *
 * To clear a row: replace the hand-built nodes with `createVexFlowAnnotation`,
 * check the app renders, and delete the line. The list only shrinks.
 */
const PRE_EXISTING = new Set([
  'src/chords/components/ChordScoreRenderer.tsx', // 1 site, 'Arial, sans-serif'
  'src/drums/components/MiniNotationRenderer.tsx', // 1 site, 'Arial, sans-serif'
  'src/drums/components/VexFlowRenderer.tsx', // 3 sites, 'Arial' and 'Arial, sans-serif'
  'src/shared/notation/ScoreDisplay.tsx', // 3 sites, 'Roboto, sans-serif'
  'src/shared/notation/scoreDisplayHelpers.ts', // 2 sites, 'Roboto, sans-serif'
  'src/words/components/VexLyricScore.tsx', // 3 sites, 'Roboto, sans-serif'
]);

const ANNOTATION_MODULE = 'vexFlowAnnotation';
/** `document.createElementNS(<ns>, 'text')` in any spelling. */
const RAW_SVG_TEXT = /createElementNS\([^)]*,\s*['"]text['"]\s*\)/;
/** A font-family assigned as a string literal rather than resolved from the host. */
const HARDCODED_FONT = /['"]font-family['"]\s*,\s*['"`]/;

describe('VexFlow annotation guardrails', () => {
  const files = vexFlowSourceFiles();

  /*
   * A glob that matches nothing passes every assertion after it. If VexFlow is
   * ever imported through a wrapper instead, this fails loudly rather than
   * quietly guarding an empty set.
   */
  it('finds the files that draw with VexFlow', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  /*
   * The baseline only shrinks, and it cannot outlive the files in it. A
   * renamed or deleted renderer must break this rather than leave a stale
   * exemption that silently excuses some future file with the same path.
   */
  it('every baselined file still exists and still draws with VexFlow', () => {
    expect([...PRE_EXISTING].filter((file) => !files.includes(file))).toEqual([]);
  });

  it.each(files)('%s does not hand-roll an SVG <text> node', (file) => {
    const source = readFileSync(path.join(REPO_ROOT, file), 'utf8');
    if (!RAW_SVG_TEXT.test(source)) return;
    if (PRE_EXISTING.has(file)) return;
    expect(
      source.includes(ANNOTATION_MODULE),
      `${file} creates an SVG <text> on a VexFlow score without ${ANNOTATION_MODULE}. ` +
        'It will inherit Bravura, or be sized in user units that the canvas scale multiplies. ' +
        'Use createVexFlowAnnotation.',
    ).toBe(true);
  });

  it.each(files)('%s does not hardcode a font family over the score', (file) => {
    const source = readFileSync(path.join(REPO_ROOT, file), 'utf8');
    if (PRE_EXISTING.has(file)) return;
    expect(
      HARDCODED_FONT.test(source),
      `${file} sets a literal font-family on a VexFlow score. The app's own family is ` +
        'whatever its theme resolved to — read it with vexFlowAnnotationFontFamily instead.',
    ).toBe(false);
  });
});
