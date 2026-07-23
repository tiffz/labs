import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Enumerate-all-surfaces ratchet for the VexFlow music-font gate.
 *
 * Every surface that imperatively draws VexFlow notation must hold its first draw
 * until the Bravura music font is loaded, or it flashes fallback glyphs on cold load
 * (detached noteheads). The shared gate is `useVexFlowMusicFontReady()` (React) /
 * `ensureVexFlowFontsLoaded()` (imperative/export). Policy:
 * `.agents/rules/playback-ui-regressions.md` § Music font gate.
 *
 * This is the `single-surface-guard` fix (docs/QUALITY_TOURNAMENT_2026-07.md Class A):
 * the gate previously lived only on the drum surfaces. This test walks EVERY module
 * that constructs a VexFlow `Renderer` and asserts it routes through the gate, so a
 * new notation surface cannot silently skip it. Known-uncovered surfaces are on the
 * burn-down ledger below — the ratchet direction is to SHRINK that set (wire the gate,
 * remove the row), never grow it.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

// A module is a "notation surface" if it constructs a VexFlow Renderer.
const RENDERER_CONSTRUCT = /new Renderer\s*\(/;
const VEXFLOW_IMPORT = /from ['"]vexflow['"]/;
// It is gated if it imports either arm of the shared gate.
const GATE_IMPORT = /useVexFlowMusicFontReady|ensureVexFlowFontsLoaded/;

/**
 * Burn-down ledger: notation surfaces not yet routed through the gate. Each flashes
 * fallback glyphs on cold load until wired to `useVexFlowMusicFontReady`. SHRINK this
 * set — wire the gate and delete the row. Do not add a row without wiring first unless
 * the surface genuinely cannot use the gate (say why).
 */
const FONT_GATE_LEDGER = new Set<string>([
  'chords/components/ChordScoreRenderer.tsx', // TODO burn down: FOUC on cold Chords load
  'chords/components/ChordStylePreview.tsx', // TODO burn down: FOUC on cold Chords style preview
  'words/components/VexLyricScore.tsx', // TODO burn down: FOUC on cold Words load
  'shared/notation/ScoreDisplay.tsx', // TODO burn down: shared — fixes Scales + Midi at once
  'melodia/components/MelodiaStaff.tsx', // divergent: own inline loadFonts('Bravura','Academico'); migrate to the shared hook (may need an Academico option)
  'shared/music/melodiaVexFirstMeasure.ts', // divergent: part of Melodia's own font path (see MelodiaStaff)
]);

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
    }
  };
  walk(SRC_ROOT);
  return out;
}

function notationSurfaces(): string[] {
  return listSourceFiles()
    .filter((file) => {
      const src = fs.readFileSync(file, 'utf8');
      return RENDERER_CONSTRUCT.test(src) && VEXFLOW_IMPORT.test(src);
    })
    .map((file) => path.relative(SRC_ROOT, file).replaceAll('\\', '/'));
}

describe('VexFlow music-font gate — enumerate all surfaces', () => {
  const surfaces = notationSurfaces();

  it('finds notation surfaces (guards the detector itself)', () => {
    // If this drops to zero the detector broke (e.g. a VexFlow API rename) and the
    // ratchet would silently pass. The gated drum surfaces should always be present.
    expect(surfaces).toContain('drums/components/VexFlowRenderer.tsx');
    expect(surfaces.length).toBeGreaterThanOrEqual(6);
  });

  it('every VexFlow notation surface routes through the music-font gate (or is a ledgered burn-down)', () => {
    const offenders = surfaces.filter((rel) => {
      if (FONT_GATE_LEDGER.has(rel)) return false;
      const src = fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
      return !GATE_IMPORT.test(src);
    });
    expect(
      offenders,
      'These surfaces draw VexFlow without the music-font gate. Wire useVexFlowMusicFontReady ' +
        '(React) or ensureVexFlowFontsLoaded (export), or add a justified row to FONT_GATE_LEDGER.',
    ).toEqual([]);
  });

  it('the burn-down ledger stays honest — no stale or already-gated rows', () => {
    for (const rel of FONT_GATE_LEDGER) {
      const abs = path.join(SRC_ROOT, rel);
      expect(fs.existsSync(abs), `Ledger row no longer exists: ${rel} — remove it`).toBe(true);
      const src = fs.readFileSync(abs, 'utf8');
      // Still a real surface (else the row is stale) and still ungated (else it's
      // burned down — delete the row so the ratchet tightens).
      expect(RENDERER_CONSTRUCT.test(src), `Ledger row is no longer a notation surface: ${rel} — remove it`).toBe(true);
      expect(
        GATE_IMPORT.test(src),
        `Ledger row is now gated: ${rel} — delete it from FONT_GATE_LEDGER so coverage ratchets up`,
      ).toBe(false);
    }
  });
});
