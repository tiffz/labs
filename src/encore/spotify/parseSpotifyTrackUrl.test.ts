import { describe, expect, it } from 'vitest';
import { parseSpotifyTrackId } from './parseSpotifyTrackUrl';

describe('parseSpotifyTrackId', () => {
  it('parses open web URL', () => {
    expect(parseSpotifyTrackId('https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6')).toBe('6rqhFgbbKwnb9MLmUQDhG6');
  });

  it('parses intl path', () => {
    expect(parseSpotifyTrackId('https://open.spotify.com/intl-de/track/6rqhFgbbKwnb9MLmUQDhG6')).toBe(
      '6rqhFgbbKwnb9MLmUQDhG6',
    );
  });

  it('parses spotify URI', () => {
    expect(parseSpotifyTrackId('spotify:track:6rqhFgbbKwnb9MLmUQDhG6')).toBe('6rqhFgbbKwnb9MLmUQDhG6');
  });

  it('accepts bare id', () => {
    expect(parseSpotifyTrackId('6rqhFgbbKwnb9MLmUQDhG6')).toBe('6rqhFgbbKwnb9MLmUQDhG6');
  });
});
