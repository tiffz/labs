import { describe, expect, it } from 'vitest';
import { parseYoutubeVideoId, youtubeWatchUrlFromInput } from './parseYoutubeVideoUrl';

describe('parseYoutubeVideoId', () => {
  it('accepts bare 11-char id', () => {
    expect(parseYoutubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses watch URL', () => {
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('dQw4w9WgXcQ');
  });

  it('parses youtu.be', () => {
    expect(parseYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses shorts path', () => {
    expect(parseYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('parses watch URL whose v= is another watch URL (double-pasted link)', () => {
    expect(
      parseYoutubeVideoId(
        'https://www.youtube.com/watch?v=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE6Vrk75N6QI',
      ),
    ).toBe('E6Vrk75N6QI');
  });

  it('parses scheme-less youtube.com watch URL with nested v=', () => {
    expect(
      parseYoutubeVideoId(
        'youtube.com/watch?v=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE6Vrk75N6QI',
      ),
    ).toBe('E6Vrk75N6QI');
  });

  it('youtubeWatchUrlFromInput returns canonical watch URL', () => {
    expect(youtubeWatchUrlFromInput('E6Vrk75N6QI')).toBe(
      'https://www.youtube.com/watch?v=E6Vrk75N6QI',
    );
    expect(
      youtubeWatchUrlFromInput(
        'youtube.com/watch?v=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE6Vrk75N6QI',
      ),
    ).toBe('https://www.youtube.com/watch?v=E6Vrk75N6QI');
    expect(youtubeWatchUrlFromInput('not-a-youtube-value')).toBeNull();
  });
});
