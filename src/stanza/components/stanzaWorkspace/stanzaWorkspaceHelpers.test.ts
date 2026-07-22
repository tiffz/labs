import { describe, expect, it } from 'vitest';
import type { StanzaSong, StanzaStemTrack } from '../../db/stanzaDb';
import { describeYoutubePlayerError, reorderStemsById, songHasPractice } from './stanzaWorkspaceHelpers';

describe('reorderStemsById', () => {
  const stems: StanzaStemTrack[] = [
    { id: 'a', label: 'A', localBlob: new Blob(), gain: 1, muted: false },
    { id: 'b', label: 'B', localBlob: new Blob(), gain: 1, muted: false },
    { id: 'c', label: 'C', localBlob: new Blob(), gain: 1, muted: false },
  ];

  it('moves a stem before another', () => {
    expect(reorderStemsById(stems, 'c', 'a').map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('returns the original list when ids are missing or equal', () => {
    expect(reorderStemsById(stems, 'missing', 'a')).toBe(stems);
    expect(reorderStemsById(stems, 'a', 'a')).toBe(stems);
  });
});

describe('songHasPractice', () => {
  it('is false for a fresh song row', () => {
    const song = { id: '1', title: 'T', updatedAt: 0 } as StanzaSong;
    expect(songHasPractice(song)).toBe(false);
  });

  it('is true when markers or stats exist', () => {
    expect(songHasPractice({ id: '1', title: 'T', updatedAt: 0, markers: [{ id: 'm', time: 0 }] } as StanzaSong)).toBe(
      true,
    );
    expect(songHasPractice({ id: '1', ytId: null, title: 'T', markers: [], updatedAt: 0, stats: { seg: { totalMs: 1, lastPracticed: 0 } } })).toBe(
      true,
    );
  });
});

describe('describeYoutubePlayerError', () => {
  it('maps known embed errors', () => {
    expect(describeYoutubePlayerError(101)).toMatch(/embedding/);
    expect(describeYoutubePlayerError(100)).toMatch(/unavailable/);
  });
});
