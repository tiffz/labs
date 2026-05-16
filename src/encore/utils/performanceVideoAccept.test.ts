import { describe, expect, it } from 'vitest';
import { fileMatchesAccept } from '../../shared/utils/fileMatchesAccept';
import { PERF_LOCAL_VIDEO_ACCEPT } from './performanceVideoAccept';

function fakeFile(name: string, type: string): File {
  return new File([new Uint8Array([0])], name, { type });
}

describe('PERF_LOCAL_VIDEO_ACCEPT', () => {
  it('accepts mainstream video MIME types', () => {
    expect(fileMatchesAccept(fakeFile('clip.mp4', 'video/mp4'), PERF_LOCAL_VIDEO_ACCEPT)).toBe(true);
    expect(fileMatchesAccept(fakeFile('clip.mov', 'video/quicktime'), PERF_LOCAL_VIDEO_ACCEPT)).toBe(true);
    expect(fileMatchesAccept(fakeFile('clip.webm', 'video/webm'), PERF_LOCAL_VIDEO_ACCEPT)).toBe(true);
  });

  it('accepts files with an empty MIME via the extension fallback', () => {
    // Some browsers (and some camera exports) report an empty MIME for `.mkv`; we still want
    // the per-song drop zone to recognize them as performance video candidates.
    expect(fileMatchesAccept(fakeFile('clip.mkv', ''), PERF_LOCAL_VIDEO_ACCEPT)).toBe(true);
    expect(fileMatchesAccept(fakeFile('clip.m4v', ''), PERF_LOCAL_VIDEO_ACCEPT)).toBe(true);
  });

  it('rejects non-video files (audio, images, PDFs)', () => {
    expect(fileMatchesAccept(fakeFile('song.mp3', 'audio/mpeg'), PERF_LOCAL_VIDEO_ACCEPT)).toBe(false);
    expect(fileMatchesAccept(fakeFile('cover.jpg', 'image/jpeg'), PERF_LOCAL_VIDEO_ACCEPT)).toBe(false);
    expect(fileMatchesAccept(fakeFile('chart.pdf', 'application/pdf'), PERF_LOCAL_VIDEO_ACCEPT)).toBe(false);
  });
});
