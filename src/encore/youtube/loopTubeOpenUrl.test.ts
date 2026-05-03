import { describe, expect, it } from 'vitest';
import { loopTubeWatchUrlFromYoutubeInput } from './loopTubeOpenUrl';

describe('loopTubeWatchUrlFromYoutubeInput', () => {
  it('maps watch URLs to looptube.io', () => {
    expect(loopTubeWatchUrlFromYoutubeInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://looptube.io/watch?v=dQw4w9WgXcQ',
    );
  });
  it('maps youtu.be links', () => {
    expect(loopTubeWatchUrlFromYoutubeInput('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://looptube.io/watch?v=dQw4w9WgXcQ',
    );
  });
  it('maps shorts URLs', () => {
    expect(loopTubeWatchUrlFromYoutubeInput('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://looptube.io/watch?v=dQw4w9WgXcQ',
    );
  });
  it('accepts bare video id', () => {
    expect(loopTubeWatchUrlFromYoutubeInput('dQw4w9WgXcQ')).toBe('https://looptube.io/watch?v=dQw4w9WgXcQ');
  });
  it('falls back to origin when id cannot be parsed', () => {
    expect(loopTubeWatchUrlFromYoutubeInput('not-a-url')).toBe('https://looptube.io');
  });
});
