import { describe, expect, it } from 'vitest';
import type { EncoreMediaLink } from '../types';
import { stanzaPracticeHrefFromEncoreMediaLink, stanzaPracticeOpenUrlFromYoutubeInput } from './stanzaPracticeOpenUrl';

describe('stanzaPracticeOpenUrlFromYoutubeInput', () => {
  it('maps watch URLs to Stanza deep links', () => {
    expect(stanzaPracticeOpenUrlFromYoutubeInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      '/stanza/?v=dQw4w9WgXcQ',
    );
  });
  it('maps youtu.be links', () => {
    expect(stanzaPracticeOpenUrlFromYoutubeInput('https://youtu.be/dQw4w9WgXcQ')).toBe(
      '/stanza/?v=dQw4w9WgXcQ',
    );
  });
  it('maps shorts URLs', () => {
    expect(stanzaPracticeOpenUrlFromYoutubeInput('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      '/stanza/?v=dQw4w9WgXcQ',
    );
  });
  it('accepts bare video id', () => {
    expect(stanzaPracticeOpenUrlFromYoutubeInput('dQw4w9WgXcQ')).toBe('/stanza/?v=dQw4w9WgXcQ');
  });
  it('falls back to Stanza root when id cannot be parsed', () => {
    expect(stanzaPracticeOpenUrlFromYoutubeInput('not-a-url')).toBe('/stanza/');
  });
});

describe('stanzaPracticeHrefFromEncoreMediaLink', () => {
  const ytLink: EncoreMediaLink = {
    id: '1',
    source: 'youtube',
    youtubeVideoId: 'dQw4w9WgXcQ',
  };
  const driveLink: EncoreMediaLink = {
    id: '2',
    source: 'drive',
    driveFileId: 'abc123',
  };

  it('returns YouTube deep link regardless of allowDriveAudio', () => {
    expect(stanzaPracticeHrefFromEncoreMediaLink(ytLink, { allowDriveAudio: false })).toBe('/stanza/?v=dQw4w9WgXcQ');
    expect(stanzaPracticeHrefFromEncoreMediaLink(ytLink, { allowDriveAudio: true })).toBe('/stanza/?v=dQw4w9WgXcQ');
  });

  it('returns Stanza root for Drive when allowed', () => {
    expect(stanzaPracticeHrefFromEncoreMediaLink(driveLink, { allowDriveAudio: true })).toBe('/stanza/');
  });

  it('returns null for Drive when not allowed', () => {
    expect(stanzaPracticeHrefFromEncoreMediaLink(driveLink, { allowDriveAudio: false })).toBeNull();
  });

  it('returns null for Spotify', () => {
    const spotify: EncoreMediaLink = { id: '3', source: 'spotify', spotifyTrackId: 'x' };
    expect(stanzaPracticeHrefFromEncoreMediaLink(spotify, { allowDriveAudio: true })).toBeNull();
  });
});
