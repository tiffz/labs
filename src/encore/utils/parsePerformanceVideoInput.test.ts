import { describe, expect, it } from 'vitest';
import { parsePerformanceVideoInput } from './parsePerformanceVideoInput';

describe('parsePerformanceVideoInput', () => {
  it('classifies Drive folder browser URLs before generic https', () => {
    expect(parsePerformanceVideoInput('https://drive.google.com/drive/folders/abc123')).toEqual({
      kind: 'drive-folder',
    });
    expect(parsePerformanceVideoInput('https://drive.google.com/drive/u/1/folders/xyz')).toEqual({
      kind: 'drive-folder',
    });
  });

  it('parses Drive file URLs and raw ids', () => {
    expect(parsePerformanceVideoInput('https://drive.google.com/file/d/abc123/view')).toEqual({
      kind: 'drive',
      fileId: 'abc123',
    });
    expect(parsePerformanceVideoInput('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toEqual({
      kind: 'drive',
      fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    });
  });

  it('still parses YouTube before Drive folder shape checks', () => {
    const yt = parsePerformanceVideoInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(yt).toEqual({ kind: 'youtube', videoId: 'dQw4w9WgXcQ' });
  });

  it('treats non-Drive https as external', () => {
    expect(parsePerformanceVideoInput('https://example.com/vid')).toEqual({
      kind: 'external',
      url: 'https://example.com/vid',
    });
  });
});
