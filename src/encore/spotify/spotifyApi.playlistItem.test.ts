import { describe, expect, it } from 'vitest';
import { parseSpotifyPlaylistItemTrack } from './spotifyApi';

describe('parseSpotifyPlaylistItemTrack', () => {
  it('reads legacy track field', () => {
    const tr = parseSpotifyPlaylistItemTrack({
      track: {
        id: 'abc',
        name: 'Song',
        artists: [{ name: 'Artist' }],
        album: { images: [] },
      },
    });
    expect(tr?.id).toBe('abc');
  });

  it('reads Get Playlist Items item field for tracks', () => {
    const tr = parseSpotifyPlaylistItemTrack({
      item: {
        type: 'track',
        id: 'xyz',
        name: 'Other',
        artists: [{ name: 'Band' }],
        album: { images: [{ url: 'https://x', height: 64 }] },
      },
    });
    expect(tr?.id).toBe('xyz');
    expect(tr?.album.images[0]?.url).toBe('https://x');
  });

  it('ignores episodes', () => {
    expect(
      parseSpotifyPlaylistItemTrack({
        item: { type: 'episode', id: 'ep1', name: 'Pod', artists: [] },
      }),
    ).toBeNull();
  });
});
