import { describe, expect, it } from 'vitest';
import { YOUTUBE_TITLE_GOLDEN_FIXTURES } from './youtubeTitleGoldenFixtures';
import {
  isLowConfidenceYoutubeTitleParse,
  parseYoutubeTitleForSong,
  parseYoutubeTitleForSongWithContext,
  stripKaraokeTrailingPhrases,
} from './parseYoutubeTitleForSong';

describe('parseYoutubeTitleForSong (golden fixtures)', () => {
  it.each(YOUTUBE_TITLE_GOLDEN_FIXTURES)('parses golden case: $id', (f) => {
    expect(parseYoutubeTitleForSong(f.raw)).toEqual({
      artist: f.encoreArtist,
      songTitle: f.encoreSong,
    });
  });
});

describe('parseYoutubeTitleForSongWithContext', () => {
  it('ignores description when title parse already has an artist', () => {
    const title = 'Les Miserables - I Dreamed A Dream (Karaoke Version)';
    const desc = 'Someone Else - Other Song';
    expect(parseYoutubeTitleForSongWithContext(title, { description: desc })).toEqual(
      parseYoutubeTitleForSong(title),
    );
  });

  it('uses first description Artist - Title line when title-only parse is low-confidence', () => {
    const title = 'Karaoke Memory YouTube 2';
    const desc = 'Real Artist - Real Song Title\nhttps://example.com\n#tags';
    expect(parseYoutubeTitleForSongWithContext(title, { description: desc })).toEqual({
      artist: 'Real Artist',
      songTitle: 'Real Song Title',
    });
  });

  it('skips description lines that are URLs or hashtag-only', () => {
    const title = 'Weird Upload Title xyz';
    const desc = 'https://youtu.be/abc\n#karaoke #broadway\nShow Name - Actual Song';
    const base = parseYoutubeTitleForSong(title);
    expect(isLowConfidenceYoutubeTitleParse(base, title)).toBe(true);
    expect(parseYoutubeTitleForSongWithContext(title, { description: desc })).toEqual({
      artist: 'Show Name',
      songTitle: 'Actual Song',
    });
  });

  it('leaves low-confidence title unchanged when description has no Artist - Title line', () => {
    const title = 'Karaoke Memory YouTube 2';
    expect(parseYoutubeTitleForSongWithContext(title, { description: 'No dash pattern here.' })).toEqual(
      parseYoutubeTitleForSong(title),
    );
  });
});

describe('stripKaraokeTrailingPhrases', () => {
  it('removes nested karaoke version bracket tail', () => {
    expect(
      stripKaraokeTrailingPhrases(
        'Billie Eilish - What Was I Made For? (Karaoke Version [From The Barbie Soundtrack]',
      ),
    ).toBe('Billie Eilish - What Was I Made For?');
  });
});
