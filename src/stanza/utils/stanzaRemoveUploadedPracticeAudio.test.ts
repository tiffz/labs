import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaSongAfterRemovingUploadedPracticeAudio } from './stanzaRemoveUploadedPracticeAudio';

function song(partial: Partial<StanzaSong> & Pick<StanzaSong, 'id'>): StanzaSong {
  return {
    ytId: 'abc',
    title: 'Test',
    markers: [{ time: 30, label: 'Verse' }],
    stats: {},
    updatedAt: 1,
    localAudioBlob: new Blob(['x'], { type: 'audio/mpeg' }),
    localMediaFingerprint: '9:180.00',
    practiceSource: 'local',
    localTransposeSemitones: 2,
    localOriginalKey: 'C major',
    analysisCache: { beat: { bpm: 120 }, version: 1 } as StanzaSong['analysisCache'],
    ...partial,
  };
}

describe('stanzaSongAfterRemovingUploadedPracticeAudio', () => {
  it('removes upload fields but keeps YouTube id and markers', () => {
    const row = song({ id: 's1' });
    const next = stanzaSongAfterRemovingUploadedPracticeAudio(row);

    expect(next.ytId).toBe('abc');
    expect(next.markers).toEqual(row.markers);
    expect(next.localAudioBlob).toBeUndefined();
    expect(next.localMediaFingerprint).toBeUndefined();
    expect(next.practiceSource).toBeUndefined();
    expect(next.localTransposeSemitones).toBeUndefined();
    expect(next.localOriginalKey).toBeUndefined();
    expect(next.analysisCache).toBeUndefined();
    expect(next.updatedAt).toBeGreaterThan(row.updatedAt);
  });
});
