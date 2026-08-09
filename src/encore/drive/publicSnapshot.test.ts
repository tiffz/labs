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

  it('never publishes a performance of an original, even on the unfiltered default path', () => {
    // Originals have no representation in the public snapshot, so such a row would ship a date,
    // venue, notes, and a resolved video URL with no subject a guest could resolve. The
    // `onlyPerformedSongs` intersection is optional, so it cannot be what hides them.
    const songs = [song('1', 'One')];
    const performances = [
      perf('p1', '1'),
      { ...perf('p2', 'o1'), subjectKind: 'original' as const, notes: 'unreleased' },
    ];

    const unfiltered = filterSnapshotSource(songs, performances);
    expect(unfiltered.performances.map((p) => p.id)).toEqual(['p1']);

    const explicitlyOff = filterSnapshotSource(songs, performances, { onlyPerformedSongs: false });
    expect(explicitlyOff.performances.map((p) => p.id)).toEqual(['p1']);

    const performedOnly = filterSnapshotSource(songs, performances, { onlyPerformedSongs: true });
    expect(performedOnly.performances.map((p) => p.id)).toEqual(['p1']);
  });

  it('does not let an original-subject performance keep a song alive under onlyPerformedSongs', () => {
    const songs = [song('1', 'One')];
    const performances = [{ ...perf('p1', '1'), subjectKind: 'original' as const }];
    const { songs: outSongs, performances: outPerfs } = filterSnapshotSource(songs, performances, {
      onlyPerformedSongs: true,
    });
    expect(outSongs).toEqual([]);
    expect(outPerfs).toEqual([]);
  });
});
