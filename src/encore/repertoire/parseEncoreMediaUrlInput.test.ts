import { describe, expect, it } from 'vitest';
import { parseEncoreMediaUrlInput, looksLikeEncoreMediaUrlInput } from './parseEncoreMediaUrlInput';
import { parseStanzaPlaybackUrl } from './parseStanzaPlaybackUrl';
import { applyParsedEncoreMediaUrlToSong } from './applyParsedEncoreMediaUrlToSong';
import type { EncoreSong } from '../types';

function makeSong(): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: 'song-1',
    title: 'Test',
    artist: 'Test',
    createdAt: now,
    updatedAt: now,
  } as EncoreSong;
}

describe('parseStanzaPlaybackUrl', () => {
  it('resolves Drive df from a Stanza share URL', () => {
    expect(
      parseStanzaPlaybackUrl(
        'https://labs.tiffzhang.com/stanza/?df=1Ap0VMHToFB-HiDTmWQTeG_PD1wzdLho4&driveTitle=piano+karaoke',
      ),
    ).toEqual({
      kind: 'drive',
      driveFileId: '1Ap0VMHToFB-HiDTmWQTeG_PD1wzdLho4',
      driveTitle: 'piano karaoke',
    });
  });

  it('resolves YouTube v from a Stanza share URL', () => {
    expect(parseStanzaPlaybackUrl('https://labs.tiffzhang.com/stanza/?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      videoId: 'dQw4w9WgXcQ',
    });
  });
});

describe('parseEncoreMediaUrlInput', () => {
  it('maps Stanza Drive links to encore drive media', () => {
    expect(
      parseEncoreMediaUrlInput(
        'https://labs.tiffzhang.com/stanza/?df=1Ap0VMHToFB-HiDTmWQTeG_PD1wzdLho4&driveTitle=piano+karaoke',
      ),
    ).toEqual({
      kind: 'drive',
      driveFileId: '1Ap0VMHToFB-HiDTmWQTeG_PD1wzdLho4',
      label: 'piano karaoke',
    });
  });

  it('maps Stanza YouTube links to encore youtube media', () => {
    // `rawInput` must be the resolved video id (not the Stanza URL) so `appendYoutube*Link`,
    // which re-parses it with `parseYoutubeVideoId`, can add the link. See regression test below.
    expect(parseEncoreMediaUrlInput('https://labs.tiffzhang.com/stanza/?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      rawInput: 'dQw4w9WgXcQ',
    });
  });

  // Regression: pasting a Stanza YouTube link into a song's reference/backing slot showed
  // "Could not add that link." because the resolved parse handed the un-parseable Stanza URL to
  // `appendYoutubeReferenceLink` (which re-parses via `parseYoutubeVideoId`). The full flow must
  // actually append a link, not just classify the URL.
  describe('adds a Stanza YouTube link to a song (full flow)', () => {
    const shapes = [
      'https://labs.tiffzhang.com/stanza/?v=iTEpbxV1S-k',
      'https://labs.tiffzhang.com/stanza?v=iTEpbxV1S-k',
      'http://localhost:5173/stanza/?v=iTEpbxV1S-k',
    ];
    for (const url of shapes) {
      it(url, () => {
        const parsed = parseEncoreMediaUrlInput(url);
        expect(parsed).toEqual({ kind: 'youtube', videoId: 'iTEpbxV1S-k', rawInput: 'iTEpbxV1S-k' });

        const ref = applyParsedEncoreMediaUrlToSong(makeSong(), parsed!, 'reference');
        expect(ref).not.toBeNull();
        expect(
          (ref!.referenceLinks ?? []).some(
            (l) => l.source === 'youtube' && l.youtubeVideoId === 'iTEpbxV1S-k',
          ),
        ).toBe(true);

        const backing = applyParsedEncoreMediaUrlToSong(makeSong(), parsed!, 'backing');
        expect(backing).not.toBeNull();
        expect(
          (backing!.backingLinks ?? []).some(
            (l) => l.source === 'youtube' && l.youtubeVideoId === 'iTEpbxV1S-k',
          ),
        ).toBe(true);
      });
    }
  });

  it('parses Spotify and YouTube URLs directly', () => {
    expect(
      parseEncoreMediaUrlInput('https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl'),
    ).toEqual({ kind: 'spotify', trackId: '11dFghVXANMlKmJXsNCbNl' });
    expect(parseEncoreMediaUrlInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      rawInput: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  });
});

describe('looksLikeEncoreMediaUrlInput', () => {
  it('treats search text differently from URLs', () => {
    expect(looksLikeEncoreMediaUrlInput('piano man billy joel')).toBe(false);
    expect(looksLikeEncoreMediaUrlInput('https://labs.tiffzhang.com/stanza/?df=abc')).toBe(true);
  });
});
