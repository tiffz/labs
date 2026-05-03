import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import { buildBulkVideoMatchText, bulkVideoIncomingSong, fileBaseName, pickBestLibrarySongForBulkVideo } from './bulkPerformanceSong';

function song(id: string, title: string, artist: string): EncoreSong {
  const now = new Date().toISOString();
  return { id, title, artist, journalMarkdown: '', createdAt: now, updatedAt: now };
}

describe('fileBaseName', () => {
  it('strips common extensions', () => {
    expect(fileBaseName('Show.mov')).toBe('Show');
    expect(fileBaseName('Clip.MP4')).toBe('Clip');
  });

  it('returns trimmed stem when no extension', () => {
    expect(fileBaseName('  Untitled  ')).toBe('Untitled');
  });
});

describe('bulkVideoIncomingSong', () => {
  it('builds incoming song for similarity', () => {
    const s = bulkVideoIncomingSong({ id: 'row1', name: 'Take.mp4', venue: "Martuni's" });
    expect(s.title).toBe('Take');
    expect(s.artist).toContain("Martuni's");
  });
});

describe('buildBulkVideoMatchText', () => {
  it('joins name, description, and path', () => {
    const t = buildBulkVideoMatchText({
      fileName: 'clip.MOV',
      description: 'Let It Go',
      parentPathHint: 'Shows / Martuni / ',
    });
    expect(t).toContain('clip.MOV');
    expect(t).toContain('Let It Go');
    expect(t).toContain('Martuni');
  });
});

describe('pickBestLibrarySongForBulkVideo', () => {
  it('uses description when file name is opaque', () => {
    const songs = [song('a', 'Let It Go', 'Stage Cast'), song('b', 'Defying Gravity', 'Wicked')];
    const best = pickBestLibrarySongForBulkVideo(songs, {
      fileName: 'IMG_9912.mov',
      description: 'Open mic: Let It Go (Frozen)',
      parentPathHint: 'Martuni / ',
    });
    expect(best?.id).toBe('a');
  });

  it('matches from filename segments before a hyphen', () => {
    const songs = [song('a', 'Let It Go', 'Frozen'), song('b', 'All I Ask of You', 'Phantom')];
    const best = pickBestLibrarySongForBulkVideo(songs, {
      fileName: "Let It Go - Martuni's.mov",
    });
    expect(best?.id).toBe('a');
  });

  it('matches long soundtrack-style library title to short filename stem', () => {
    const songs = [
      song('a', 'Let It Go - From "Frozen"/Soundtrack Version', 'Idina Menzel'),
      song('b', 'Sister Rosetta Goes Before Us', 'Robert Plant, Alison Krauss'),
    ];
    expect(
      pickBestLibrarySongForBulkVideo(songs, { fileName: "Let It Go - Martuni's.mov" })?.id,
    ).toBe('a');
    expect(pickBestLibrarySongForBulkVideo(songs, { fileName: 'Let It Go.mov' })?.id).toBe('a');
  });

  it('returns null when nothing clears the confidence threshold', () => {
    const songs = [song('a', 'Zebra', 'Artist')];
    const best = pickBestLibrarySongForBulkVideo(songs, { fileName: 'IMG_0001.mov' });
    expect(best).toBeNull();
  });
});
