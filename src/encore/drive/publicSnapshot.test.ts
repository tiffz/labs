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

describe('supporting roles stay off the guest page', () => {
  const songs = [song('1', 'One')];

  it('omits a performance where she was the accompanist', () => {
    const performances = [{ ...perf('p1', '1'), role: 'Instrumental' as const }];
    expect(filterSnapshotSource(songs, performances).performances).toHaveLength(0);
  });

  it('omits a performance where she sang backing vocal', () => {
    const performances = [{ ...perf('p1', '1'), role: 'Backing vocal' as const }];
    expect(filterSnapshotSource(songs, performances).performances).toHaveLength(0);
  });

  it('publishes lead vocal but not instrumental', () => {
    // Instrumental covers playing rather than singing lead, solo or for someone else. The guest
    // page is the singing archive, so it stays off.
    const performances = [
      { ...perf('p1', '1'), role: 'Lead vocal' as const },
      { ...perf('p2', '1'), role: 'Instrumental' as const },
    ];
    expect(filterSnapshotSource(songs, performances).performances.map((p) => p.id)).toEqual(['p1']);
  });

  it('omits a legacy Accompanist row', () => {
    // Merged into Instrumental. If the alias were missing this would fall back to Lead vocal and
    // publish accompaniment work to the guest page.
    const performances = [{ ...perf('p1', '1'), role: 'Accompanist' as unknown as undefined }];
    expect(filterSnapshotSource(songs, performances).performances).toHaveLength(0);
  });

  it('publishes a performance with no role at all', () => {
    // Absent means Lead vocal. Every performance logged before roles existed has no role, so a
    // filter that dropped them would silently empty the guest page of her entire back catalogue.
    expect(filterSnapshotSource(songs, [perf('p1', '1')]).performances).toHaveLength(1);
  });

  it('drops supporting roles on the onlyPerformedSongs path too', () => {
    // The role filter runs before the intersection, so it cannot be bypassed by the option.
    const performances = [{ ...perf('p1', '1'), role: 'Instrumental' as const }];
    const out = filterSnapshotSource(songs, performances, { onlyPerformedSongs: true });
    expect(out.performances).toHaveLength(0);
    expect(out.songs).toHaveLength(0);
  });
});
