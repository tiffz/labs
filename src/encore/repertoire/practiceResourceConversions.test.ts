import { describe, expect, it } from 'vitest';
import { miscResourceFromAttachment, miscResourceFromMediaLink } from './practiceResourceConversions';
import type { EncoreMediaLink, EncoreSongAttachment } from '../types';

describe('practiceResourceConversions', () => {
  it('miscResourceFromMediaLink builds Spotify URL from track id', () => {
    const link: EncoreMediaLink = {
      id: 'l1',
      source: 'spotify',
      spotifyTrackId: 'abc123',
      label: 'My track',
    };
    const misc = miscResourceFromMediaLink(link);
    expect(misc.kind).toBe('link');
    expect(misc.label).toBe('My track');
    expect(misc.url).toBe('https://open.spotify.com/track/abc123');
  });

  it('miscResourceFromMediaLink builds YouTube URL from video id', () => {
    const link: EncoreMediaLink = {
      id: 'l2',
      source: 'youtube',
      youtubeVideoId: 'vid99',
    };
    const misc = miscResourceFromMediaLink(link);
    expect(misc.url).toBe('https://www.youtube.com/watch?v=vid99');
    expect(misc.label).toBe('YouTube video');
  });

  it('miscResourceFromAttachment preserves chart label and notes', () => {
    const att: EncoreSongAttachment = {
      kind: 'chart',
      driveFileId: 'drive-chart-1',
      label: 'Lead sheet',
      notes: 'Verse only',
    };
    const misc = miscResourceFromAttachment(att);
    expect(misc.label).toBe('Lead sheet');
    expect(misc.notes).toBe('Verse only');
    expect(misc.kind).toBe('file');
    expect(misc.driveFileId).toBe('drive-chart-1');
  });
});
