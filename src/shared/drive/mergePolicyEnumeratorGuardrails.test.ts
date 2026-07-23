import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Enumerate-all-surfaces ratchet for the Drive-sync `MergePolicy` gate.
 *
 * Drive apps sync a local library against a remote copy and merge them row by row.
 * When a merge takes the whole row by `updatedAt` (last-writer-wins), a newer-but-sparser
 * copy silently drops fields the other side filled — the "Because of You" data-loss class
 * (ADR 0019, docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md). The fix is a compile-enforced
 * per-field policy map: `SONG_MERGE_POLICY` in `encore/drive/encoreRepertoireMerge.ts` is
 * typed `satisfies Record<keyof EncoreSong, MergePolicy>`, so adding a field to the entity
 * without classifying its merge disposition fails typecheck. That protection currently
 * covers ONLY `EncoreSong`.
 *
 * This test is the sibling of `shared/notation/vexFlowMusicFontGateGuardrails.test.ts`:
 * exactly as that one walks every module that constructs a VexFlow `Renderer` and asserts
 * it routes through the music-font gate, this walks every Drive module that DEFINES an
 * entity merge and asserts it routes through an enforced `MergePolicy` map — or sits on the
 * burn-down ledger below. The ratchet direction is to SHRINK the ledger (wire a policy map,
 * delete the row), never grow it. No new ungated Drive merge surface can land silently.
 *
 * WHY THIS IS SOURCE-WALKING (and where it stops): the surface set is computed by reading
 * every non-test file under a `drive/` directory — a new app that adds a `*DriveMerge.ts`
 * with an exported merge is detected automatically and fails until gated or ledgered. The
 * one gap: a merge inlined inside a sync ORCHESTRATOR without an exported `merge*` function
 * (the way `repertoireSync.ts` open-codes the performance LWW pick) is not detected on its
 * own — that path is already represented here by its extracted helper module
 * (`repertoireWire.ts` `mergeRecordsByUpdatedAt`). Keep entity merges in an exported
 * `merge*` function, not open-coded in the pull/push orchestrator, or the ratchet cannot
 * see them.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

// A merge surface lives under a `drive/` directory and exports a `merge*` function.
const IN_DRIVE_DIR = /(^|\/)drive\//;
const EXPORTS_MERGE_FN = /export (async )?function merge\w+/;
// It is an *entity* merge (not a tombstone/collection/activity helper) when it resolves a
// whole-row conflict — either the last-writer-wins idiom comparing two rows' `updatedAt`, or
// a merge named for the synced payload / library / progress / record set it folds together.
const ENTITY_LWW_IDIOM = /\b\w+\.updatedAt\s*>=?\s*\w+\.updatedAt\b/;
const ENTITY_MERGE_NAME = /\bmerge\w*(SyncPayload|IntoLocalLibrary|IntoRows|Progress|Records|ByUpdatedAt)\b/;
// It is GATED when it defines or drives an enforced `satisfies Record<keyof X, MergePolicy>`
// map. Detected on code with comments stripped so a mere mention (e.g. a `TODO: give this a
// policy like SONG_MERGE_POLICY` note) does not read as coverage.
const POLICY_MAP_DEFINITION = /satisfies Record<keyof \w+, MergePolicy>/;
const POLICY_DRIVEN_SYMBOL = /\b(SONG_MERGE_POLICY|songMergePolicyKeys|mergeSongRecords|mergeSongPreservingExercises)\b/;

/**
 * Burn-down ledger: Drive entity merges NOT yet behind a compile-enforced `MergePolicy` map.
 * Each merges whole rows (or hand-listed fields) with no `satisfies Record<keyof Entity,
 * MergePolicy>` backstop, so a newly added field to the entity round-trips through wire + UI
 * with zero type error yet is silently dropped on cross-device merge (ADR 0019). SHRINK this
 * set — give the entity a policy map and delete the row. Do not add a row without a policy
 * first unless the entity genuinely cannot use one (say why).
 *
 * Wiring each row up means the same move made for `EncoreSong`: declare
 * `const X_MERGE_POLICY = { ... } satisfies Record<keyof Entity, MergePolicy>` and drive the
 * merge from `Object.keys(X_MERGE_POLICY)` instead of a spread + hand-listed fields.
 *
 *   encore/drive/repertoireWire.ts            — EncorePerformance (+ RepertoireExtras). `mergeRecordsByUpdatedAt`
 *                                               is whole-row LWW; a second video logged on another device is
 *                                               dropped when a newer sparse copy wins. Needs PERFORMANCE_MERGE_POLICY
 *                                               (union `videos` by id) — tracked separately (drive-sync-redteam #2).
 *   encore/originals/drive/encoreOriginalsMerge.ts — EncoreOriginalSong. Hand-listed content preservation; no
 *                                               keyof-Entity map, so a new original field is not caught.
 *   encore/originals/drive/originalsWire.ts   — EncoreOriginalSong wire merge (`mergeOriginalsByUpdatedAt`).
 *   stanza/drive/stanzaDriveMerge.ts          — StanzaSong. Rich per-field merge but no enforced policy map.
 *   stanza/drive/stanzaPracticeOverlaySync.ts — Stanza practice-overlay rows, whole-row LWW by `updatedAt`.
 *   gesture/drive/gestureDriveMerge.ts        — GesturePack / GesturePackFile. Field-rank merge, no policy map.
 *   lyrefly/drive/lyreflyDriveMerge.ts        — Lyrefly project summary (`mergeLyreflySyncPayload`).
 *   lyrefly/drive/lyreflyPackageFieldMerge.ts — Lyrefly project package fields (pages, scripts, assets).
 *   scales/drive/scalesDriveMerge.ts          — ScalesProgress / ExerciseProgress (`mergeScalesProgress`).
 *   zinebox/drive/zineboxDriveMerge.ts        — ZineboxComic / ZineboxCollection (`mergeZineboxSyncPayload`).
 */
const MERGE_POLICY_LEDGER = new Set<string>([
  'encore/drive/repertoireWire.ts',
  'encore/originals/drive/encoreOriginalsMerge.ts',
  'encore/originals/drive/originalsWire.ts',
  'stanza/drive/stanzaDriveMerge.ts',
  'stanza/drive/stanzaPracticeOverlaySync.ts',
  'gesture/drive/gestureDriveMerge.ts',
  'lyrefly/drive/lyreflyDriveMerge.ts',
  'lyrefly/drive/lyreflyPackageFieldMerge.ts',
  'scales/drive/scalesDriveMerge.ts',
  'zinebox/drive/zineboxDriveMerge.ts',
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

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Every Drive module that defines a synced-entity merge, as `src`-relative paths. */
function mergeSurfaces(): string[] {
  return listSourceFiles()
    .filter((file) => {
      const rel = path.relative(SRC_ROOT, file).replaceAll('\\', '/');
      if (!IN_DRIVE_DIR.test(rel)) return false;
      const src = fs.readFileSync(file, 'utf8');
      if (!EXPORTS_MERGE_FN.test(src)) return false;
      return ENTITY_LWW_IDIOM.test(src) || ENTITY_MERGE_NAME.test(src);
    })
    .map((file) => path.relative(SRC_ROOT, file).replaceAll('\\', '/'));
}

/** A surface is gated when it defines or is driven by an enforced `MergePolicy` map. */
function isGated(rel: string): boolean {
  const code = stripComments(fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8'));
  return POLICY_MAP_DEFINITION.test(code) || POLICY_DRIVEN_SYMBOL.test(code);
}

describe('Drive MergePolicy gate — enumerate all merge surfaces', () => {
  const surfaces = mergeSurfaces();

  it('finds Drive entity merge surfaces (guards the detector itself)', () => {
    // If this drops (e.g. a merge-helper rename), the ratchet would silently pass. The
    // policy-gated song merge must always be present.
    expect(surfaces).toContain('encore/drive/encoreRepertoireMerge.ts');
    expect(surfaces.length).toBeGreaterThanOrEqual(8);
  });

  it('the policy-gated song merge is actually detected as gated', () => {
    // Sanity on the gate detector: the one wired surface must read as gated, else every
    // ungated surface would slip through as "already covered".
    expect(isGated('encore/drive/encoreRepertoireMerge.ts')).toBe(true);
  });

  it('every Drive entity merge routes through an enforced MergePolicy map (or is a ledgered burn-down)', () => {
    const offenders = surfaces.filter((rel) => {
      if (MERGE_POLICY_LEDGER.has(rel)) return false;
      return !isGated(rel);
    });
    expect(
      offenders,
      'These Drive merges resolve rows without a compile-enforced MergePolicy map, so a newly ' +
        'added entity field is silently dropped on cross-device merge (ADR 0019). Give the entity ' +
        'a `satisfies Record<keyof Entity, MergePolicy>` map and drive the merge from it, or add a ' +
        'justified row to MERGE_POLICY_LEDGER.',
    ).toEqual([]);
  });

  it('every ledgered surface is still an ungated merge surface (keeps the ledger honest)', () => {
    for (const rel of MERGE_POLICY_LEDGER) {
      const abs = path.join(SRC_ROOT, rel);
      expect(fs.existsSync(abs), `Ledger row no longer exists: ${rel} — remove it`).toBe(true);
      // Still a detected merge surface (else the row is stale) …
      expect(
        surfaces.includes(rel),
        `Ledger row is no longer a detected merge surface: ${rel} — remove it`,
      ).toBe(true);
      // … and still ungated (else it burned down — delete the row so the ratchet tightens).
      expect(
        isGated(rel),
        `Ledger row is now behind a MergePolicy map: ${rel} — delete it from MERGE_POLICY_LEDGER so coverage ratchets up`,
      ).toBe(false);
    }
  });
});
