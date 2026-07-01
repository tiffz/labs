import { describe, expect, it } from 'vitest';
import { parseEncoreMediaUrlInput, looksLikeEncoreMediaUrlInput } from './parseEncoreMediaUrlInput';
import { parseStanzaPlaybackUrl } from './parseStanzaPlaybackUrl';

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
    expect(parseEncoreMediaUrlInput('https://labs.tiffzhang.com/stanza/?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      rawInput: 'https://labs.tiffzhang.com/stanza/?v=dQw4w9WgXcQ',
    });
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
