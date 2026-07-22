import { describe, expect, it } from 'vitest';
import {
  getPrimaryPerformanceVideo,
  normalizeEncorePerformance,
  performanceExtraVideoCount,
  setPrimaryPerformanceVideo,
  syncPerformanceLegacyVideoFields,
} from './performanceVideoModel';
import type { EncorePerformance } from '../types';

const basePerformance = (): EncorePerformance => ({
  id: 'perf-1',
  songId: 'song-1',
  date: '2024-09-17',
  venueTag: 'Blue Note',
  createdAt: '2024-09-18T00:00:00.000Z',
  updatedAt: '2024-09-18T00:00:00.000Z',
});

describe('performanceVideoModel', () => {
  it('synthesizes videos[] from legacy single-video fields on read', () => {
    const legacy: EncorePerformance = {
      ...basePerformance(),
      videoTargetDriveFileId: 'drive-target',
      videoShortcutDriveFileId: 'drive-shortcut',
    };
    const normalized = normalizeEncorePerformance(legacy);
    expect(normalized.videos).toHaveLength(1);
    expect(normalized.primaryVideoId).toBe(normalized.videos![0]!.id);
    expect(getPrimaryPerformanceVideo(normalized)?.videoTargetDriveFileId).toBe('drive-target');
  });

  it('syncs legacy top-level fields from primary video', () => {
    const stacked: EncorePerformance = {
      ...basePerformance(),
      videos: [
        {
          id: 'v1',
          createdAt: '2024-09-18T00:00:00.000Z',
          externalVideoUrl: 'https://www.youtube.com/watch?v=abc123',
        },
        {
          id: 'v2',
          createdAt: '2024-09-18T00:00:00.000Z',
          videoTargetDriveFileId: 'drive-2',
        },
      ],
      primaryVideoId: 'v2',
    };
    const synced = syncPerformanceLegacyVideoFields(stacked);
    expect(synced.videoTargetDriveFileId).toBe('drive-2');
    expect(synced.externalVideoUrl).toBeUndefined();
    expect(performanceExtraVideoCount(stacked)).toBe(1);
  });

  it('setPrimaryPerformanceVideo updates primary and legacy fields', () => {
    const stacked: EncorePerformance = {
      ...basePerformance(),
      videos: [
        {
          id: 'v1',
          createdAt: '2024-09-18T00:00:00.000Z',
          externalVideoUrl: 'https://www.youtube.com/watch?v=abc123',
        },
        {
          id: 'v2',
          createdAt: '2024-09-18T00:00:00.000Z',
          videoTargetDriveFileId: 'drive-2',
        },
      ],
      primaryVideoId: 'v1',
    };
    const updated = setPrimaryPerformanceVideo(stacked, 'v2');
    expect(updated.primaryVideoId).toBe('v2');
    expect(getPrimaryPerformanceVideo(updated)?.videoTargetDriveFileId).toBe('drive-2');
    expect(updated.externalVideoUrl).toBeUndefined();
  });
});
