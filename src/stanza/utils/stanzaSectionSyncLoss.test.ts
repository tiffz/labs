import { describe, expect, it } from 'vitest';
import { mergeStanzaRicherSongMetadataWithReport } from './stanzaSongMetadataMerge';
import { recordDeletedMarkerIds } from './stanzaMarkerTombstones';
import type { StanzaSong } from '../db/stanzaDb';

/**
 * The owner's report: "I've had sections get lost in syncing."
 *
 * `mergePracticeMarkers` chose one side WHOLESALE by marker count and only merged per-id when the
 * counts were equal. Two concrete losses follow, both reproduced below against the old code:
 *
 *  A. Concurrent edit on the smaller side is discarded. Add sections on one device, rename a
 *     section on the other, and the rename vanishes — the larger side wins entirely.
 *  B. Deletion cannot be expressed. Delete sections on one device and the next pull restores them
 *     from the device that still has them, because "more markers" reads as "more recent work".
 */

function song(overrides: Partial<StanzaSong> = {}): StanzaSong {
  return {
    id: 's1',
    ytId: null,
    title: 'Song',
    markers: [],
    stats: {},
    updatedAt: 1000,
    ...overrides,
  } as StanzaSong;
}

const m = (id: string, time: number, label: string) => ({ id, time, label });

describe('section sync loss', () => {
  it('A: a rename on the smaller side survives a merge with a larger side', () => {
    // Device B renamed "Verse" -> "Verse 1" (still 2 markers).
    const local = song({
      updatedAt: 50,
      markers: [m('a', 10, 'Verse 1'), m('b', 20, 'Chorus')],
    });
    // Device A added a third section (3 markers), keeping the old label for 'a'.
    const remote = song({
      updatedAt: 60,
      markers: [m('a', 10, 'Verse'), m('b', 20, 'Chorus'), m('c', 30, 'Bridge')],
    });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    // The added section arrives...
    expect(merged.markers.map((x) => x.id).sort()).toEqual(['a', 'b', 'c']);
    // ...and the rename is NOT thrown away. Old code returned remote wholesale -> 'Verse'.
    expect(merged.markers.find((x) => x.id === 'a')?.label).toBe('Verse 1');
  });

  it('B: a deleted section stays deleted instead of being restored by the other device', () => {
    const before = [m('a', 10, 'Verse'), m('b', 20, 'Chorus'), m('c', 30, 'Bridge')];
    const after = [m('a', 10, 'Verse')];

    // Local device deleted 'b' and 'c'; the persist choke point records the tombstones.
    const deletedMarkerIds = recordDeletedMarkerIds({
      previousMarkers: before,
      nextMarkers: after,
      existing: undefined,
      now: 500,
    });
    const local = song({ updatedAt: 500, markers: after, deletedMarkerIds });

    // Remote is a stale copy that still has all three.
    const remote = song({ updatedAt: 400, markers: before });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    expect(merged.markers.map((x) => x.id)).toEqual(['a']);
  });

  it('B2: re-adding a deleted section after the delete keeps it', () => {
    // Clock supersede: the tombstone only wins while nobody has touched the marker since.
    const deletedMarkerIds = recordDeletedMarkerIds({
      previousMarkers: [m('a', 10, 'Verse'), m('b', 20, 'Chorus')],
      nextMarkers: [m('a', 10, 'Verse')],
      existing: undefined,
      now: 500,
    });

    // Remote re-added 'b' at a later clock than the delete.
    const local = song({ updatedAt: 500, markers: [m('a', 10, 'Verse')], deletedMarkerIds });
    const remote = song({
      updatedAt: 900,
      markers: [m('a', 10, 'Verse'), m('b', 20, 'Chorus')],
    });

    const merged = mergeStanzaRicherSongMetadataWithReport(local, remote).song;

    expect(merged.markers.map((x) => x.id).sort()).toEqual(['a', 'b']);
  });

  it('re-adding a marker locally clears its tombstone', () => {
    // Otherwise the next pull would delete it again — the restore-after-delete trap.
    const first = recordDeletedMarkerIds({
      previousMarkers: [m('a', 10, 'V'), m('b', 20, 'C')],
      nextMarkers: [m('a', 10, 'V')],
      existing: undefined,
      now: 500,
    });
    expect(first?.b).toBe(500);

    const second = recordDeletedMarkerIds({
      previousMarkers: [m('a', 10, 'V')],
      nextMarkers: [m('a', 10, 'V'), m('b', 20, 'C')],
      existing: first,
      now: 600,
    });
    expect(second?.b).toBeUndefined();
  });
});
