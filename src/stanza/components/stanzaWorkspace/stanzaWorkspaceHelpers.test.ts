import { describe, expect, it } from 'vitest';
import type { StanzaStemTrack } from '../../db/stanzaDb';
import { describeYoutubePlayerError, reorderStemsById } from './stanzaWorkspaceHelpers';

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


describe('describeYoutubePlayerError', () => {
  it('maps known embed errors', () => {
    expect(describeYoutubePlayerError(101)).toMatch(/embedding/);
    expect(describeYoutubePlayerError(100)).toMatch(/unavailable/);
  });
});
