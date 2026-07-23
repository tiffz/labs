import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Layer-presence fitness test (Encore) — arch-10 from `docs/ENCORE_LAUNCH_REVIEW_2026-07.md`.
 *
 * `docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md` asserts a set of data-loss defense layers for Encore
 * (auto-push gate, delete tombstones + merge filter, content-aware merge, undo snapshot, …). The
 * P0 data-loss incidents traced to the DOC claiming layers the CODE did not actually implement, so
 * the prose out-ran reality with zero signal. This test converts each claimed layer into a
 * behavior/import-presence guardrail: if a layer is ripped out of the code, this test goes red, so
 * the doc can never again claim protection Encore does not have.
 *
 * Deliberately coarse (symbol presence, not behavior) — the behavioral guarantees live in
 * `repertoireSync.test.ts`, `encoreRepertoireMerge.test.ts`, `repertoireWire.test.ts`, and
 * `encoreRepertoireTombstones.test.ts`. This file guards the WIRING existing at all.
 */

function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8');
}

const repertoireSync = read('./repertoireSync.ts');
const repertoireWire = read('./repertoireWire.ts');
const repertoireMerge = read('./encoreRepertoireMerge.ts');
const actionsContext = read('../context/EncoreActionsContext.tsx');
const syncContext = read('../context/EncoreSyncContext.tsx');
const encoreDbTypes = read('../db/encoreDb.ts');
const wireTypes = read('../types.ts');

describe('Drive sync data-loss layer presence (Encore)', () => {
  it('Layer: delete tombstones — song/performance ids exist in storage + wire types', () => {
    for (const field of ['deletedSongIds', 'deletedPerformanceIds']) {
      expect(encoreDbTypes, `RepertoireExtrasRow.${field}`).toContain(field);
      expect(wireTypes, `RepertoireWirePayload.${field}`).toContain(field);
    }
  });

  it('Layer: delete tombstones — the merge FILTERS songs/performances by tombstone (clock-aware)', () => {
    // A tombstone that is stored but not consulted is the exact "doc claims ✅, code does not" bug.
    // The pull merge and conflict-resolve merge both route rows through filterTombstonedRows, which
    // applies the clock supersede (B1). Two call sites (pull + resolveConflictWithChoices).
    expect(repertoireSync).toContain('filterTombstonedRows');
    expect(repertoireSync.match(/filterTombstonedRows\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(repertoireSync).toContain('mergedExtras.deletedSongIds');
    expect(repertoireSync).toContain('mergedExtras.deletedPerformanceIds');
  });

  it('Layer: auto-push gate is fail-closed — the assert is unconditional, not gated on writeGuard', () => {
    // S1: `if (opts?.writeGuard)` would let a caller that forgets the guard bypass the gate.
    expect(repertoireSync).not.toMatch(/if \(opts\?\.writeGuard\) \{\s*assertLabsDriveWriteAllowed/);
    expect(repertoireSync).toMatch(/autoPushAllowed: opts\?\.writeGuard\?\.autoPushAllowed \?\? false/);
  });

  it('Layer: delete tombstones — delete sites RECORD tombstones (and undo clears them)', () => {
    expect(actionsContext).toContain('recordDeletedSongIds');
    expect(actionsContext).toContain('recordDeletedPerformanceIds');
    expect(actionsContext).toContain('clearDeletedSongIds');
    expect(actionsContext).toContain('clearDeletedPerformanceIds');
  });

  it('Layer: tombstones merge-union across devices', () => {
    expect(repertoireWire).toContain('unionDeletedRowIds');
  });

  it('Layer: auto-push gate — push primitive asserts the write guard', () => {
    expect(repertoireSync).toContain('assertLabsDriveWriteAllowed');
    expect(repertoireSync).toContain('writeGuard');
  });

  it('Layer: auto-push gate — background push defers until a reconciling pull this session', () => {
    expect(syncContext).toContain('sessionPullSucceededRef');
    // The gate must actually short-circuit the push, not just declare a flag.
    expect(syncContext).toMatch(/if \(!sessionPullSucceededRef\.current\)/);
  });

  it('Layer: content-aware merge — SONG + PERFORMANCE merge policies are compile-enforced', () => {
    expect(repertoireMerge).toMatch(/SONG_MERGE_POLICY[\s\S]*satisfies Record<keyof EncoreSong, MergePolicy>/);
    expect(repertoireMerge).toMatch(
      /PERFORMANCE_MERGE_POLICY[\s\S]*satisfies Record<keyof EncorePerformance, MergePolicy>/,
    );
    // The performance policy must union videos (the P0-3 fix), not drop them via whole-row LWW.
    expect(repertoireMerge).toMatch(/videos:\s*'union-by-id'/);
  });

  it('Layer: content-aware merge is wired into the live pull (not just defined)', () => {
    expect(repertoireSync).toContain('mergeSongRecords');
    expect(repertoireSync).toContain('mergePerformanceRecords');
  });

  it('Layer: pre-merge undo snapshot runs before pull/merge', () => {
    expect(repertoireSync).toContain('snapshotEncoreRepertoireBeforeSync');
  });

  it('Layer: exercise-run tombstones remain wired (ADR 0019 follow-up)', () => {
    expect(repertoireSync).toContain('deletedRunIds');
    expect(repertoireWire).toContain('unionDeletedExerciseRunIds');
  });

  it('Layer: conflict ANALYSIS filters tombstoned rows, not just the resolve/pull merge (S3)', () => {
    // Without this, the review dialog offers "keep this device" for a row already deleted elsewhere,
    // then the post-resolution filter silently discards the pick. analyzeRepertoireConflict must take
    // tombstones and route both sides through filterTombstonedRows.
    expect(repertoireSync).toMatch(/analyzeRepertoireConflict[\s\S]*tombstones/);
    expect(repertoireSync).toMatch(/filterTombstonedRows\(local\.songs/);
    expect(repertoireSync).toMatch(/filterTombstonedRows\(remote\.songs/);
  });

  it('Layer: dismissing a conflict surfaces "not backed up", not a false "Backed up" (S4)', () => {
    // "Decide later" leaves edits diverged and unpushed; the status must not revert to idle/Backed up.
    expect(syncContext).toMatch(/dismissConflict[\s\S]*setSyncState\('deferred'\)/);
    const accountMenu = read('../components/EncoreAccountMenu.tsx');
    expect(accountMenu).toContain("syncState === 'deferred'");
    expect(accountMenu).toContain('Not backed up');
  });
});
