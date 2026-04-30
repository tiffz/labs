import { describe, expect, it } from 'vitest';
import type { EncorePerformance } from '../types';
import { performanceVideoOpenUrl } from './performanceVideoUrl';

function perf(p: Partial<EncorePerformance>): EncorePerformance {
  const now = new Date().toISOString();
  return {
    id: 'p1',
    songId: 's1',
    date: '2026-01-01',
    venueTag: 'X',
    createdAt: now,
    updatedAt: now,
    ...p,
  };
}

describe('performanceVideoOpenUrl', () => {
  it('prefers external URL', () => {
    const u = performanceVideoOpenUrl(
      perf({ externalVideoUrl: 'https://youtu.be/abc', videoTargetDriveFileId: 'driveid' }),
    );
    expect(u).toBe('https://youtu.be/abc');
  });

  it('uses Drive when no external URL', () => {
    const u = performanceVideoOpenUrl(perf({ videoTargetDriveFileId: 'abc123XYZ' }));
    expect(u).toContain('drive.google.com');
    expect(u).toContain('abc123XYZ');
  });

  it('returns null when no video fields', () => {
    expect(performanceVideoOpenUrl(perf({}))).toBeNull();
  });
});
