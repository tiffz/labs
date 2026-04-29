/**
 * Spike: `get-artist-title` (npm) vs Encore `parseYoutubeTitleForSong` on {@link YOUTUBE_TITLE_GOLDEN_FIXTURES}.
 *
 * Summary (third-party lib with `defaultArtist: channel`):
 * - **Strong agreement with Encore/golden** on typical `Artist - Title (Karaoke Version)` uploads
 *   (e.g. les-mis-karaoke, shallow-comma-artists, tracy-chapman, adele-sing-king).
 * - **Does not handle** `||` musical-theatre splits (double-pipe): falls back to default artist + full string.
 * - **Mis-splits** long quoted `from …` Phantom/Jekyll-style titles (artist/title junk).
 * - **Wrong** on smart-quote `On My Own` / Six patterns, first-`|` waitress-style titles, slash-karaoke
 *   composer rows, and leading `[Instrumental]` reflection-style titles.
 * - **Swaps** artist/title on `"Days and Days" - Fun Home` compared to Encore (lib puts quoted phrase as artist).
 *
 * Conclusion: keep Encore heuristics as source of truth; treat `get-artist-title` as reference only, not a drop-in.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { YOUTUBE_TITLE_GOLDEN_FIXTURES } from './youtubeTitleGoldenFixtures';
import { parseYoutubeTitleForSong } from './parseYoutubeTitleForSong';

const require = createRequire(import.meta.url);
const getArtistTitle = require('get-artist-title') as (
  str: string,
  opts?: { defaultArtist?: string },
) => [string, string] | undefined;

/** Fixture ids where `get-artist-title` matches the same artist + song as Encore (and golden). */
const GET_ARTIST_TITLE_MATCHES_ENCORE_IDS = new Set([
  'les-mis-karaoke',
  'shallow-comma-artists',
  'tracy-chapman',
  'adele-sing-king',
]);

describe('get-artist-title spike vs Encore golden fixtures', () => {
  it.each(YOUTUBE_TITLE_GOLDEN_FIXTURES)('Encore matches golden: $id', (f) => {
    const enc = parseYoutubeTitleForSong(f.raw);
    expect(enc).toEqual({ artist: f.encoreArtist, songTitle: f.encoreSong });
  });

  it.each(YOUTUBE_TITLE_GOLDEN_FIXTURES.filter((f) => GET_ARTIST_TITLE_MATCHES_ENCORE_IDS.has(f.id)))(
    'get-artist-title agrees with Encore on simple Sing-King-style titles: $id',
    (f) => {
      const gat = getArtistTitle(f.raw, { defaultArtist: f.channel });
      expect(gat).toBeDefined();
      const enc = parseYoutubeTitleForSong(f.raw);
      expect({ artist: gat![0], songTitle: gat![1] }).toEqual(enc);
    },
  );

  it('documents double-pipe failure mode for get-artist-title', () => {
    const f = YOUTUBE_TITLE_GOLDEN_FIXTURES.find((x) => x.id === 'double-pipe')!;
    const gat = getArtistTitle(f.raw, { defaultArtist: f.channel });
    expect(gat).toEqual([f.channel, f.raw]);
    expect(parseYoutubeTitleForSong(f.raw)).toEqual({
      artist: f.encoreArtist,
      songTitle: f.encoreSong,
    });
  });
});
