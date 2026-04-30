import { describe, expect, it } from 'vitest';
import { filterSnapshotSource } from './publicSnapshot';
import type { EncorePerformance, EncoreSong } from '../types';

const song = (id: string, title: string): EncoreSong => ({
  id,
  title,
  artist: 'A',
  journalMarkdown: '',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

const perf = (id: string, songId: string): EncorePerformance => ({
  id,
  songId,
  date: '2024-06-01',
  venueTag: 'V',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
});

describe('filterSnapshotSource', () => {
  it('returns all songs when onlyPerformedSongs is false', () => {
    const songs = [song('1', 'One'), song('2', 'Two')];
    const performances = [perf('p1', '1')];
    const { songs: outSongs, performances: outPerfs } = filterSnapshotSource(songs, performances, {
      onlyPerformedSongs: false,
    });
    expect(outSongs).toHaveLength(2);
    expect(outPerfs).toHaveLength(1);
  });

  it('keeps only songs with at least one performance', () => {
    const songs = [song('1', 'One'), song('2', 'Two')];
    const performances = [perf('p1', '1')];
    const { songs: outSongs, performances: outPerfs } = filterSnapshotSource(songs, performances, {
      onlyPerformedSongs: true,
    });
    expect(outSongs.map((s) => s.id)).toEqual(['1']);
    expect(outPerfs.map((p) => p.songId)).toEqual(['1']);
  });
});
