import { describe, expect, it } from 'vitest';
import {
  collectUniquePlaylistIdsFromMixedPaste,
  collectUniqueSpotifyPlaylistIds,
  collectUniqueYouTubePlaylistIds,
  splitPlaylistPaste,
} from './collectPlaylistIdsFromText';

describe('collectPlaylistIdsFromText', () => {
  it('splitPlaylistPaste handles newlines and commas', () => {
    expect(splitPlaylistPaste('a\nb, c')).toEqual(['a', 'b', 'c']);
  });

  it('collectUniqueSpotifyPlaylistIds dedupes and preserves order', () => {
    const a = '37i9dQZF1DXcBWIGoYBM5M';
    const b = '37i9dQZF1DWSf3RBdXDXz';
    const raw = `https://open.spotify.com/playlist/${a}
https://open.spotify.com/playlist/${a}
spotify:playlist:${b}`;
    expect(collectUniqueSpotifyPlaylistIds(raw)).toEqual([a, b]);
  });

  it('collectUniqueYouTubePlaylistIds parses multiple list URLs', () => {
    const plA = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
    const plB = 'PLtest123456789012345678901234567890';
    const raw = `https://www.youtube.com/playlist?list=${plA}
https://www.youtube.com/playlist?list=${plB},${plA}`;
    expect(collectUniqueYouTubePlaylistIds(raw)).toEqual([plA, plB]);
  });

  it('collectUniquePlaylistIdsFromMixedPaste splits Spotify and YouTube from one blob', () => {
    const sp = '37i9dQZF1DXcBWIGoYBM5M';
    const pl = 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
    const raw = `https://open.spotify.com/playlist/${sp}
https://www.youtube.com/playlist?list=${pl}`;
    expect(collectUniquePlaylistIdsFromMixedPaste(raw)).toEqual({
      spotifyIds: [sp],
      youtubeIds: [pl],
    });
  });

  it('mixed paste treats bare 22-char alnum as Spotify when both parsers would match', () => {
    const id = '37i9dQZF1DXcBWIGoYBM5M';
    expect(collectUniquePlaylistIdsFromMixedPaste(id)).toEqual({
      spotifyIds: [id],
      youtubeIds: [],
    });
  });
});
