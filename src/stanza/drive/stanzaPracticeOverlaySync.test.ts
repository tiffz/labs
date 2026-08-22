import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import {
  buildStanzaPracticeOverlayFromRows,
  mergeStanzaPracticeOverlayIntoRows,
  overlayKeyForStanzaSong,
} from './stanzaPracticeOverlaySync';

function song(id: string, markers: StanzaSong['markers'] = []): StanzaSong {
  return {
    id,
    ytId: null,
    title: `Song ${id}`,
    markers,
    stats: {},
    updatedAt: 1000,
  };
}

describe('overlayKeyForStanzaSong', () => {
  it('prefers encoreSongId, then drive file id, then yt id', () => {
    expect(overlayKeyForStanzaSong({ ...song('a'), encoreSongId: 'enc-1' })).toBe('enc-1');
    expect(overlayKeyForStanzaSong({ ...song('a'), driveSourceFileId: 'df-1' })).toBe('drive:df-1');
    expect(overlayKeyForStanzaSong({ ...song('a'), ytId: 'yt-1' })).toBe('yt:yt-1');
    expect(overlayKeyForStanzaSong(song('a'))).toBe('a');
  });
});

describe('mergeStanzaPracticeOverlayIntoRows', () => {
  it('applies overlay markers when overlay is richer', () => {
    const local = [song('s1', [{ id: 'm1', label: 'A', time: 1 }])];
    const overlay = buildStanzaPracticeOverlayFromRows([
      {
        ...song('s1', [
          { id: 'm1', label: 'A', time: 1 },
          { id: 'm2', label: 'B', time: 2 },
        ]),
        updatedAt: 2000,
      },
    ]);
    const merged = mergeStanzaPracticeOverlayIntoRows(local, overlay);
    expect(merged[0].markers).toHaveLength(2);
    expect(merged[0].updatedAt).toBe(2000);
  });

  it('keeps local markers when overlay is sparser', () => {
    const local = [
      song('s1', [
        { id: 'm1', label: 'A', time: 1 },
        { id: 'm2', label: 'B', time: 2 },
      ]),
    ];
    const overlay = buildStanzaPracticeOverlayFromRows([song('s1', [{ id: 'm1', label: 'A', time: 1 }])]);
    const merged = mergeStanzaPracticeOverlayIntoRows(local, overlay);
    expect(merged[0].markers).toHaveLength(2);
  });

  it('keeps local drumsEnabled when overlay has equal markers but false toggle', () => {
    const local = [
      {
        ...song('s1', [{ id: 'm1', label: 'A', time: 1 }]),
        drumsEnabled: true,
        updatedAt: 2000,
      },
    ];
    const overlay = buildStanzaPracticeOverlayFromRows([
      {
        ...song('s1', [{ id: 'm1', label: 'A', time: 1 }]),
        drumsEnabled: false,
        updatedAt: 2000,
      },
    ]);
    const merged = mergeStanzaPracticeOverlayIntoRows(local, overlay);
    expect(merged[0].drumsEnabled).toBe(true);
  });

  it('keeps a newer local skip clear over a stale overlay skip map', () => {
    const local = [
      {
        ...song('s1', [{ id: 'm1', label: 'A', time: 1 }]),
        skippedBySegmentId: undefined,
        updatedAt: 3000,
      },
    ];
    const overlay = buildStanzaPracticeOverlayFromRows([
      {
        ...song('s1', [{ id: 'm1', label: 'A', time: 1 }]),
        skippedBySegmentId: { 'seg-end': true },
        updatedAt: 1000,
      },
    ]);
    const merged = mergeStanzaPracticeOverlayIntoRows(local, overlay);
    expect(merged[0].skippedBySegmentId).toBeUndefined();
  });

  it('writes empty skip maps so clears round-trip through the overlay', () => {
    const overlay = buildStanzaPracticeOverlayFromRows([
      {
        ...song('s1'),
        skippedBySegmentId: undefined,
        updatedAt: 2000,
      },
    ]);
    expect(overlay.entries.s1?.skippedBySegmentId).toEqual({});
  });
});

/*
 * The overlay is the SECOND sync channel for the same rows, and it never got the fix the first one
 * did.
 *
 * `stanzaSongMetadataMerge` documents the marker-count heuristic as the bug it removed: "It lost
 * data both ways: a rename on the smaller side was discarded wholesale, and a delete was undone by
 * any device that still had the section." The overlay still runs exactly that heuristic, then
 * assigns `markers` wholesale from the overlay entry.
 *
 * Worse, `deletedMarkerIds` is not among `OVERLAY_FIELDS` and not on the entry type at all, so a
 * deletion cannot even be expressed on this channel. `useStanzaDriveBackup` applies the overlay
 * AFTER the fixed merge, on the same rows — so the fixed merge's output is the overlay's input,
 * and the overlay can overwrite it.
 */
describe('overlay resolves markers by the shared policy', () => {
  const m = (id: string, time: number) => ({ id, time, label: id });

  it('honours a tombstone the overlay predates', () => {
    /*
     * The overlay entry still lists "b", but it was last touched BEFORE the delete, so it cannot
     * vouch for the marker. Under the old marker-count heuristic the overlay simply won on count
     * and "b" came back. This is the deletion-undo the user reported, on the second channel.
     */
    const local: StanzaSong = {
      ...song('s1', [m('a', 10)]),
      updatedAt: 2000,
      deletedMarkerIds: { b: 1500 },
    };
    const overlay = buildStanzaPracticeOverlayFromRows([
      { ...song('s1', [m('a', 10), m('b', 20)]), updatedAt: 1200 },
    ]);

    const [merged] = mergeStanzaPracticeOverlayIntoRows([local], overlay);
    expect(
      (merged!.markers ?? []).map((x) => x.id).sort(),
      'the deleted section came back through the overlay channel'
    ).toEqual(['a']);
  });

  it('keeps a marker the overlay vouches for after the delete', () => {
    /*
     * The mirror case, and the reason the rule is clock-based rather than "deletes always win":
     * an overlay touched AFTER the tombstone may have deliberately re-added the section. This
     * matches `progress.json` exactly — verified by running the same input through
     * `mergePracticeMarkers` directly.
     */
    const local: StanzaSong = {
      ...song('s2', [m('a', 10)]),
      updatedAt: 2000,
      deletedMarkerIds: { b: 1500 },
    };
    const overlay = buildStanzaPracticeOverlayFromRows([
      { ...song('s2', [m('a', 10), m('b', 20)]), updatedAt: 2500 },
    ]);

    const [merged] = mergeStanzaPracticeOverlayIntoRows([local], overlay);
    expect((merged!.markers ?? []).map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('does not discard the richer side just because it has fewer markers', () => {
    // The other half of what the count heuristic lost: a rename on the smaller side.
    const local: StanzaSong = {
      ...song('s3', [{ id: 'a', time: 10, label: 'Chorus' }]),
      updatedAt: 3000,
    };
    const overlay = buildStanzaPracticeOverlayFromRows([
      { ...song('s3', [m('a', 10), m('b', 20)]), updatedAt: 2000 },
    ]);

    const [merged] = mergeStanzaPracticeOverlayIntoRows([local], overlay);
    expect((merged!.markers ?? []).find((x) => x.id === 'a')?.label).toBe('Chorus');
  });
});
