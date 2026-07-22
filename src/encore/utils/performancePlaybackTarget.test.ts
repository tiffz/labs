import { describe, expect, it } from 'vitest';
import type { EncorePerformance } from '../types';
import { performanceVideoPlaybackTarget } from './performancePlaybackTarget';

const basePerformance = (): EncorePerformance => ({
  id: 'perf-1',
  songId: 'song-1',
  date: '2026-06-11',
  venueTag: 'Club',
  videos: [
    { id: 'v1', videoTargetDriveFileId: 'drive-primary', createdAt: '2026-06-11T00:00:00.000Z' },
    { id: 'v2', externalVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', createdAt: '2026-06-11T00:00:00.000Z' },
  ],
  primaryVideoId: 'v1',
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
});

describe('performanceVideoPlaybackTarget', () => {
  it('builds a drive-video target from the primary clip by default', () => {
    const target = performanceVideoPlaybackTarget(basePerformance(), undefined, {
      songTitle: 'On My Own',
    });
    expect(target?.kind).toBe('drive-video');
    expect(target?.driveFileId).toBe('drive-primary');
    expect(target?.title).toBe('On My Own');
    expect(target?.subtitle).toContain('2026-06-11');
  });

  it('builds a youtube target when a specific stack clip is youtube', () => {
    const perf = basePerformance();
    const video = perf.videos![1]!;
    const target = performanceVideoPlaybackTarget(perf, video);
    expect(target?.kind).toBe('youtube');
    expect(target?.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('returns null when the clip has no playable source', () => {
    const perf: EncorePerformance = {
      ...basePerformance(),
      videos: [{ id: 'v-empty', createdAt: '2026-06-11T00:00:00.000Z' }],
      primaryVideoId: 'v-empty',
    };
    expect(performanceVideoPlaybackTarget(perf)).toBeNull();
  });
});
