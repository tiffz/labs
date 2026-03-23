import { describe, expect, it } from 'vitest';
import { buildYouTubeEmbedUrl, extractYouTubeVideoId } from './beatLibraryService';

describe('beatLibraryService youtube helpers', () => {
  it('extracts canonical YouTube IDs from watch URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
  });

  it('extracts IDs from youtu.be URLs', () => {
    expect(extractYouTubeVideoId('https://youtu.be/xyz789')).toBe('xyz789');
  });

  it('returns null for non-youtube URLs', () => {
    expect(extractYouTubeVideoId('https://example.com/video.mp4')).toBeNull();
  });

  it('builds a valid embed URL', () => {
    const embedUrl = buildYouTubeEmbedUrl('abc123');
    expect(embedUrl).toContain('youtube.com/embed/abc123');
    expect(embedUrl).toContain('enablejsapi=1');
  });
});
