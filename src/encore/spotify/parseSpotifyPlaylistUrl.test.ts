import { describe, expect, it } from 'vitest';
import { parseSpotifyPlaylistId } from './parseSpotifyPlaylistUrl';

describe('parseSpotifyPlaylistId', () => {
  it('parses open URL', () => {
    expect(parseSpotifyPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(
      '37i9dQZF1DXcBWIGoYBM5M',
    );
  });

  it('parses intl path', () => {
    expect(parseSpotifyPlaylistId('https://open.spotify.com/intl-de/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBe(
      '37i9dQZF1DXcBWIGoYBM5M',
    );
  });

  it('parses spotify URI', () => {
    expect(parseSpotifyPlaylistId('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });

  it('accepts raw id', () => {
    expect(parseSpotifyPlaylistId('37i9dQZF1DXcBWIGoYBM5M')).toBe('37i9dQZF1DXcBWIGoYBM5M');
  });

  it('returns null for garbage', () => {
    expect(parseSpotifyPlaylistId('not-a-playlist')).toBeNull();
  });
});
