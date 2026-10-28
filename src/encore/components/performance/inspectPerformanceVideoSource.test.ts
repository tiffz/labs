import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_VIDEO_EMPTY,
  PERFORMANCE_VIDEO_NOT_A_VIDEO,
  inspectPerformanceVideoSource,
} from './inspectPerformanceVideoSource';

const file = (name: string, type: string, bytes = 'x') => new File([bytes], name, { type });

describe('inspectPerformanceVideoSource', () => {
  it('stages a video to upload on save', async () => {
    const video = file('Gig.mov', 'video/quicktime');
    await expect(inspectPerformanceVideoSource({ kind: 'file', file: video })).resolves.toMatchObject({
      ok: true,
      plan: video,
      sizeBytes: 1,
    });
  });

  it('refuses a file that is not a video, and an empty one, with the reason', async () => {
    await expect(inspectPerformanceVideoSource({ kind: 'file', file: file('notes.txt', 'text/plain') })).resolves.toEqual({
      ok: false,
      name: 'notes.txt',
      message: PERFORMANCE_VIDEO_NOT_A_VIDEO,
    });
    await expect(inspectPerformanceVideoSource({ kind: 'file', file: file('Gig.mp4', 'video/mp4', '') })).resolves.toEqual({
      ok: false,
      name: 'Gig.mp4',
      message: PERFORMANCE_VIDEO_EMPTY,
    });
  });
});
