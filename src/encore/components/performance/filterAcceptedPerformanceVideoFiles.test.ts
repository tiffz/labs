import { describe, expect, it } from 'vitest';
import { filterAcceptedPerformanceVideoFiles } from './filterAcceptedPerformanceVideoFiles';

function videoFile(name = 'clip.mp4'): File {
  return new File(['x'], name, { type: 'video/mp4' });
}

describe('filterAcceptedPerformanceVideoFiles', () => {
  it('keeps accepted video files', () => {
    const a = videoFile('a.mp4');
    const b = videoFile('b.mov');
    expect(filterAcceptedPerformanceVideoFiles([a, b])).toEqual([a, b]);
  });

  it('drops non-video files', () => {
    const pdf = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    expect(filterAcceptedPerformanceVideoFiles([pdf, videoFile()])).toEqual([videoFile()]);
  });
});
