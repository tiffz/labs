import { describe, expect, it } from 'vitest';
import { pickGuestYoutubeBackingWatchUrl } from './guestYoutubeBackingWatchUrl';

describe('pickGuestYoutubeBackingWatchUrl', () => {
  it('returns null when missing or no YouTube backing', () => {
    expect(pickGuestYoutubeBackingWatchUrl(undefined)).toBeNull();
    expect(pickGuestYoutubeBackingWatchUrl([])).toBeNull();
    expect(
      pickGuestYoutubeBackingWatchUrl([{ id: '1', source: 'spotify', spotifyTrackId: 'abc' }]),
    ).toBeNull();
  });

  it('prefers primary backing, then karaoke kind, then order', () => {
    const a = {
      id: 'a',
      source: 'youtube' as const,
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeKind: 'other' as const,
    };
    const b = {
      id: 'b',
      source: 'youtube' as const,
      youtubeVideoId: 'abcdefghijk',
      youtubeKind: 'karaoke' as const,
      isPrimaryBacking: true,
    };
    expect(pickGuestYoutubeBackingWatchUrl([a, b])).toBe(
      'https://www.youtube.com/watch?v=abcdefghijk',
    );
    expect(pickGuestYoutubeBackingWatchUrl([b, a])).toBe(
      'https://www.youtube.com/watch?v=abcdefghijk',
    );
  });

  it('accepts first resolvable when no primary', () => {
    expect(
      pickGuestYoutubeBackingWatchUrl([
        { id: '1', source: 'youtube', youtubeVideoId: 'dQw4w9WgXcQ', youtubeKind: 'karaoke' },
        { id: '2', source: 'youtube', youtubeVideoId: 'not-a-url' },
      ]),
    ).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});
