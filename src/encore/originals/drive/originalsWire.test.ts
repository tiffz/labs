import { describe, expect, it } from 'vitest';
import { mergeOriginalsByUpdatedAt, originalsToWire, parseOriginalsWire } from './originalsWire';
import type { EncoreOriginalSong } from '../types';

const row = (id: string, updatedAt: string): EncoreOriginalSong => ({
  id,
  title: id,
  key: 'C',
  tempo: 80,
  lyricsAndChords: '',
  takes: [],
  mainTakeId: null,
  history: [],
  createdAt: updatedAt,
  updatedAt,
});

describe('originalsWire', () => {
  it('round-trips wire json', () => {
    const songs = [row('a', '2026-01-02T00:00:00.000Z')];
    const json = JSON.stringify(originalsToWire(songs));
    const parsed = parseOriginalsWire(json);
    expect(parsed.songs).toHaveLength(1);
  });

  it('strips legacy tags, status, brainstorm markdown, and google doc ids from wire rows', () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: '2026-01-02T00:00:00.000Z',
      songs: [
        {
          ...row('a', '2026-01-02T00:00:00.000Z'),
          tags: ['mood'],
          status: 'Completed',
          brainstormMarkdown: 'old notes',
          driveBrainstormGoogleDocId: 'doc123',
        },
      ],
    });
    const parsed = parseOriginalsWire(json);
    expect(parsed.songs[0]).not.toHaveProperty('tags');
    expect(parsed.songs[0]).not.toHaveProperty('status');
    expect(parsed.songs[0]).not.toHaveProperty('brainstormMarkdown');
    expect(parsed.songs[0]).not.toHaveProperty('driveBrainstormGoogleDocId');
    expect(parsed.songs[0].brainstormHtml).toContain('old notes');
  });

  it('merge prefers newer updatedAt', () => {
    const merged = mergeOriginalsByUpdatedAt(
      [row('a', '2026-01-01T00:00:00.000Z')],
      [row('a', '2026-01-03T00:00:00.000Z')],
    );
    expect(merged[0]?.updatedAt).toBe('2026-01-03T00:00:00.000Z');
  });
});
