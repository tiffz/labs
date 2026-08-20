import { describe, expect, it } from 'vitest';
import { backfillSongMarkerIds } from './stanzaMarkerIdBackfill';
import type { StanzaSong } from './stanzaDb';
import { DERIVED_MARKER_ID_PREFIX, isDerivedMarkerId } from '../utils/segments';

function song(markers: StanzaSong['markers'], extra?: Partial<StanzaSong>): StanzaSong {
  return {
    id: 'song-1',
    title: 'Test',
    markers,
    updatedAt: 1000,
    ...extra,
  } as StanzaSong;
}

/**
 * This backfill rewrites stored song rows, so the bar is "provably lossless", not "looks right".
 * Every assertion below is about what must NOT change.
 */
describe('backfillSongMarkerIds', () => {
  it('assigns a permanent id to a marker that has none', () => {
    const result = backfillSongMarkerIds(song([{ time: 10, label: 'A' }]));
    expect(result).not.toBeNull();
    expect(result!.assigned).toBe(1);
    const id = result!.song.markers[0]!.id;
    expect(id).toBeTruthy();
    expect(isDerivedMarkerId(id)).toBe(false);
  });

  it('replaces a derived id with a permanent one', () => {
    // Derived ids encode the marker's TIME, so they change when it moves and cannot be synced.
    const derived = `${DERIVED_MARKER_ID_PREFIX}10.0000`;
    const result = backfillSongMarkerIds(song([{ time: 10, label: 'A', id: derived }]));
    expect(result).not.toBeNull();
    expect(result!.song.markers[0]!.id).not.toBe(derived);
    expect(isDerivedMarkerId(result!.song.markers[0]!.id)).toBe(false);
  });

  it('never changes marker count, time, label, or order', () => {
    const before = [
      { time: 30, label: 'C' },
      { time: 10, label: 'A' },
      { time: 20, label: 'B', id: 'keep-me' },
    ];
    const result = backfillSongMarkerIds(song([...before]));
    expect(result).not.toBeNull();
    const after = result!.song.markers;
    expect(after).toHaveLength(before.length);
    after.forEach((m, i) => {
      expect(m.time).toBe(before[i]!.time);
      expect(m.label).toBe(before[i]!.label);
    });
  });

  it('leaves an existing permanent id untouched', () => {
    const result = backfillSongMarkerIds(
      song([
        { time: 10, label: 'A', id: 'real-uuid-1' },
        { time: 20, label: 'B' },
      ])
    );
    expect(result!.song.markers[0]!.id).toBe('real-uuid-1');
    expect(result!.assigned).toBe(1);
  });

  it('does not bump updatedAt', () => {
    // A backfill must never outrank a genuine edit from another device in last-write-wins merge,
    // and must not make a clean row look dirty to sync.
    const result = backfillSongMarkerIds(song([{ time: 10, label: 'A' }], { updatedAt: 4242 }));
    expect(result!.song.updatedAt).toBe(4242);
  });

  it('preserves every other field on the row', () => {
    const extras = {
      ytId: 'abc123',
      skippedBySegmentId: { 'stanzaSeg:x:y': true as const },
      deletedMarkerIds: { 'gone-1': 1700000000000 },
    };
    const result = backfillSongMarkerIds(song([{ time: 10, label: 'A' }], extras));
    expect(result!.song.ytId).toBe(extras.ytId);
    expect(result!.song.skippedBySegmentId).toEqual(extras.skippedBySegmentId);
    expect(result!.song.deletedMarkerIds).toEqual(extras.deletedMarkerIds);
  });

  it('returns null when there is nothing to do, so the row is not rewritten', () => {
    expect(backfillSongMarkerIds(song([{ time: 10, label: 'A', id: 'real' }]))).toBeNull();
    expect(backfillSongMarkerIds(song([]))).toBeNull();
  });

  it('assigns a distinct id to each marker, including two at the same time', () => {
    // Derived ids collapse same-time markers to one id by design. Permanent ids must not.
    const result = backfillSongMarkerIds(
      song([
        { time: 10, label: 'A' },
        { time: 10, label: 'B' },
      ])
    );
    const ids = result!.song.markers.map((m) => m.id);
    expect(new Set(ids).size).toBe(2);
  });
});
