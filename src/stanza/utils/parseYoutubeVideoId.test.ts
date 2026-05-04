import { describe, expect, it } from 'vitest';
import { parseYoutubeVideoId } from './parseYoutubeVideoId';

describe('parseYoutubeVideoId', () => {
  it('accepts bare 11-char ids', () => {
    expect(parseYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses watch URLs', () => {
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
});
