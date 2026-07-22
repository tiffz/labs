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
