import { describe, expect, it } from 'vitest';
import { encoreSongStubFromSpotifySearchTrack } from './encoreSpotifyPlaylistSync';
import type { SpotifySearchTrack } from './spotifyApi';

describe('encoreSongStubFromSpotifySearchTrack', () => {
  it('maps search track fields onto a repertoire stub', () => {
    const track: SpotifySearchTrack = {
      id: 'abc123',
      name: 'Test Song',
      artists: [{ name: 'Test Artist' }],
      album: { images: [{ url: 'https://example.com/art.jpg', height: 64 }] },
    };
    const stub = encoreSongStubFromSpotifySearchTrack(track, { practicing: true });
    expect(stub.title).toBe('Test Song');
    expect(stub.artist).toBe('Test Artist');
    expect(stub.spotifyTrackId).toBe('abc123');
    expect(stub.albumArtUrl).toBe('https://example.com/art.jpg');
    expect(stub.practicing).toBe(true);
  });
});
