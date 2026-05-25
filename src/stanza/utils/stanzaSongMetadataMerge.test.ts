import { describe, expect, it } from 'vitest';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaSongPracticeCustomizationScore } from './stanzaSongCustomizationScore';
import {
  mergeStanzaRicherSongMetadata,
  mergeStanzaRicherSongMetadataWithReport,
} from './stanzaSongMetadataMerge';

function song(p: Partial<StanzaSong> & Pick<StanzaSong, 'id' | 'title' | 'updatedAt'>): StanzaSong {
  return {
    ytId: null,
    markers: [],
    stats: {},
    ...p,
  };
}

describe('stanzaSongPracticeCustomizationScore', () => {
  it('scores zero for an unsectioned song', () => {
    expect(stanzaSongPracticeCustomizationScore(song({ id: 'a', title: 'T', updatedAt: 1 }))).toBe(0);
  });

  it('scores markers beyond implicit start', () => {
    const s = song({
      id: 'a',
      title: 'T',
      updatedAt: 1,
      markers: [
        { id: 'm1', time: 0, label: 'A' },
        { id: 'm2', time: 30, label: 'Verse' },
      ],
    });
    expect(stanzaSongPracticeCustomizationScore(s)).toBeGreaterThan(0);
  });
});

describe('mergeStanzaRicherSongMetadata', () => {
  it('keeps local markers when remote is newer but empty', () => {
    const local = song({
      id: '1',
      title: 'Local',
      updatedAt: 5,
      markers: [
        { id: 'a', time: 10, label: 'A' },
        { id: 'b', time: 40, label: 'B' },
      ],
    });
    const remote = {
      id: '1',
      ytId: 'vid',
      title: 'Remote',
      markers: [],
      stats: {},
      updatedAt: 100,
    };
    const merged = mergeStanzaRicherSongMetadata(local, remote);
    expect(merged.markers).toHaveLength(2);
    expect(merged.title).toBe('Remote');
  });

  it('reports markersRecoveredFromLocal when remote would have won', () => {
    const local = song({
      id: '1',
      title: 'Local',
      updatedAt: 5,
      markers: [{ id: 'a', time: 10, label: 'Intro' }],
    });
    const remote = {
      id: '1',
      ytId: 'vid',
      title: 'Remote',
      markers: [],
      stats: {},
      updatedAt: 100,
    };
    const r = mergeStanzaRicherSongMetadataWithReport(local, remote);
    expect(r.markersRecoveredFromLocal).toBe(true);
    expect(r.song.markers).toHaveLength(1);
  });

  it('takes remote when remote has more markers', () => {
    const local = song({
      id: '1',
      title: 'Local',
      updatedAt: 200,
      markers: [{ id: 'a', time: 1, label: 'L' }],
    });
    const remote = {
      id: '1',
      ytId: 'vid',
      title: 'Remote',
      markers: [
        { id: 'b', time: 2, label: 'R' },
        { id: 'c', time: 40, label: 'R2' },
      ],
      stats: {},
      updatedAt: 10,
    };
    const merged = mergeStanzaRicherSongMetadata(local, remote);
    expect(merged.markers).toHaveLength(2);
    expect(merged.title).toBe('Local');
  });
});
