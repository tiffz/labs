import { describe, expect, it } from 'vitest';
import { BEAT_ANALYSIS_VERSION } from '../../shared/beat/analysisVersion';
import type { StanzaSong } from '../db/stanzaDb';
import { stanzaSongPracticeCustomizationScore } from './stanzaSongCustomizationScore';
import {
  mergeStanzaRicherSongMetadata,
  mergeStanzaRicherSongMetadataWithReport,
  resolveDriveSourceFileIdForMerge,
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

describe('resolveDriveSourceFileIdForMerge', () => {
  it('adopts remote Drive link when local row has metadata only', () => {
    expect(
      resolveDriveSourceFileIdForMerge(
        { ytId: null, driveSourceFileId: undefined, localAudioBlob: undefined },
        { driveSourceFileId: 'drive-main-1' },
      ),
    ).toBe('drive-main-1');
  });

  it('keeps local Drive link when bytes are already on device', () => {
    expect(
      resolveDriveSourceFileIdForMerge(
        {
          ytId: null,
          driveSourceFileId: 'local-file',
          localAudioBlob: new Blob(['x'], { type: 'audio/mpeg' }),
        },
        { driveSourceFileId: 'remote-file' },
      ),
    ).toBe('local-file');
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

  it('keeps local drumPattern when remote is newer but omitted', () => {
    const local = song({
      id: '1',
      title: 'Local',
      updatedAt: 5,
      drumPattern: 'D-T-K-T-',
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
    expect(merged.drumPattern).toBe('D-T-K-T-');
  });

  it('keeps explicit zero Beat 1 when analysis cache would infer offset', () => {
    const local = song({
      id: '1',
      title: 'Local',
      updatedAt: 5,
      metronomeSongCalibration: {
        bpm: 120,
        anchorMediaTime: 0,
        firstBeatOffsetSec: 0,
        source: 'tap',
      },
      analysisCache: {
        beat: {
          bpm: 118,
          confidence: 0.9,
          confidenceLevel: 'high',
          beats: [0, 0.5],
          musicStartTime: 2.5,
          musicEndTime: 180,
          offset: 0,
          warnings: [],
        },
        metadata: {
          analysisVersion: BEAT_ANALYSIS_VERSION,
          analyzedAt: 1,
          stale: false,
        },
      },
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
    expect(merged.metronomeSongCalibration?.firstBeatOffsetSec).toBe(0);
    expect(merged.metronomeSongCalibration?.source).toBe('tap');
  });
});
