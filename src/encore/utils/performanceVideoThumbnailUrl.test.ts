import { describe, expect, it } from 'vitest';
import type { EncorePerformance } from '../types';
import { performanceVideoThumbnailUrl } from './performanceVideoThumbnailUrl';

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

describe('performanceVideoThumbnailUrl', () => {
  it('returns YouTube mq thumbnail for youtu.be external URL', () => {
    const u = performanceVideoThumbnailUrl(
      perf({ externalVideoUrl: 'https://youtu.be/dQw4w9WgXcQ' }),
    );
    expect(u).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
  });

  it('returns YouTube thumbnail for watch URL', () => {
    const u = performanceVideoThumbnailUrl(
      perf({ externalVideoUrl: 'https://www.youtube.com/watch?v=abcdefghijk' }),
    );
    expect(u).toBe('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg');
  });

  it('uses Drive thumbnail when only Drive file id is set', () => {
    const u = performanceVideoThumbnailUrl(perf({ videoTargetDriveFileId: 'abcXYZ' }));
    expect(u).toBe('https://drive.google.com/thumbnail?id=abcXYZ&sz=w480');
  });

  it('prefers target Drive id over shortcut for thumbnail', () => {
    const u = performanceVideoThumbnailUrl(
      perf({ videoShortcutDriveFileId: 'shortcut1', videoTargetDriveFileId: 'target99' }),
    );
    expect(u).toBe('https://drive.google.com/thumbnail?id=target99&sz=w480');
  });

  it('prefers YouTube thumb when external is YouTube even if Drive id exists', () => {
    const u = performanceVideoThumbnailUrl(
      perf({
        externalVideoUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        videoTargetDriveFileId: 'driveOnly',
      }),
    );
    expect(u).toContain('i.ytimg.com');
    expect(u).toContain('aaaaaaaaaaa');
  });

  it('falls back to Drive thumb for non-YouTube external URL when Drive id exists', () => {
    const u = performanceVideoThumbnailUrl(
      perf({
        externalVideoUrl: 'https://vimeo.com/123456',
        videoTargetDriveFileId: 'driveFallback',
      }),
    );
    expect(u).toBe('https://drive.google.com/thumbnail?id=driveFallback&sz=w480');
  });

  it('returns Drive thumb when only external URL is a raw Drive file id', () => {
    const u = performanceVideoThumbnailUrl(
      perf({ externalVideoUrl: '1l5KrBq55l4JKqcT16oCwoU5S_Evxt5HO' }),
    );
    expect(u).toBe(
      'https://drive.google.com/thumbnail?id=1l5KrBq55l4JKqcT16oCwoU5S_Evxt5HO&sz=w480',
    );
  });

  it('returns Drive thumb when external URL is a drive.google.com file link without target fields', () => {
    const u = performanceVideoThumbnailUrl(
      perf({
        externalVideoUrl: 'https://drive.google.com/file/d/1ABCd_xyz123FOOBAR/view?usp=drive_link',
      }),
    );
    expect(u).toBe('https://drive.google.com/thumbnail?id=1ABCd_xyz123FOOBAR&sz=w480');
  });

  it('returns null when no video fields', () => {
    expect(performanceVideoThumbnailUrl(perf({}))).toBeNull();
  });
});
