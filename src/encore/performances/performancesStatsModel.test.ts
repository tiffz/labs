import { describe, expect, it } from 'vitest';
import {
  buildPerformanceDashboardStats,
  buildTopSongsByPerformanceCount,
} from './performancesStatsModel';
import type { EncorePerformance, EncoreSong } from '../types';
import type { EncoreOriginalSong } from '../originals/types';

function song(id: string, title: string): EncoreSong {
  return {
    id,
    title,
    artist: 'Someone Else',
    journalMarkdown: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as EncoreSong;
}

function original(id: string, title: string): EncoreOriginalSong {
  return {
    id,
    title,
    key: 'C',
    tempo: 100,
    lyricsAndChords: '',
    takes: [],
    mainTakeId: null,
    history: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as EncoreOriginalSong;
}

function perf(id: string, songId: string, date: string, subjectKind?: 'original'): EncorePerformance {
  return {
    id,
    songId,
    ...(subjectKind ? { subjectKind } : {}),
    date,
    venueTag: 'Club',
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

const songs = new Map([['s1', song('s1', 'A Cover')]]);
const originals = new Map([['o1', original('o1', 'Georgia On My Coast')]]);
const noVenueNorm = (t: string) => t;

describe('buildPerformanceDashboardStats — originals', () => {
  it('names an original in mostPerformed instead of collapsing it to Unknown song', () => {
    const performances = [
      perf('p1', 'o1', '2026-01-01', 'original'),
      perf('p2', 'o1', '2026-02-01', 'original'),
      perf('p3', 's1', '2026-03-01'),
    ];

    const stats = buildPerformanceDashboardStats(performances, songs, noVenueNorm, originals)!;

    expect(stats.mostPerformed?.count).toBe(2);
    expect(stats.mostPerformed?.subject.title).toBe('Georgia On My Coast');
    expect(stats.mostPerformed?.subject.kind).toBe('original');
    // Tiles that want album art still get `null` — originals are not repertoire rows.
    expect(stats.mostPerformed?.song).toBeNull();
  });

  it('does not merge a song and an original that happen to share an id', () => {
    // Grouping on the raw songId would count these as one subject with 2 plays.
    const performances = [perf('p1', 'x', '2026-01-01'), perf('p2', 'x', '2026-02-01', 'original')];
    const stats = buildPerformanceDashboardStats(
      performances,
      new Map([['x', song('x', 'Cover X')]]),
      noVenueNorm,
      new Map([['x', original('x', 'Original X')]]),
    )!;

    expect(stats.mostPerformed?.count).toBe(1);
    expect(stats.total).toBe(2);
  });

  it('links an original subject to its songwriting page, not #/song', () => {
    const performances = [perf('p1', 'o1', '2026-01-01', 'original')];
    const stats = buildPerformanceDashboardStats(performances, songs, noVenueNorm, originals)!;
    expect(stats.bestRecent?.subject.href).toBe('#/originals/o1');
  });

  it('still resolves plain song rows when no originals map is supplied', () => {
    const performances = [perf('p1', 's1', '2026-01-01')];
    const stats = buildPerformanceDashboardStats(performances, songs, noVenueNorm)!;
    expect(stats.mostPerformed?.subject.title).toBe('A Cover');
    expect(stats.mostPerformed?.song?.id).toBe('s1');
  });
});

describe('buildTopSongsByPerformanceCount — originals', () => {
  it('ranks originals alongside covers under their own titles', () => {
    const performances = [
      perf('p1', 'o1', '2026-01-01', 'original'),
      perf('p2', 'o1', '2026-02-01', 'original'),
      perf('p3', 'o1', '2026-03-01', 'original'),
      perf('p4', 's1', '2026-04-01'),
    ];

    const top = buildTopSongsByPerformanceCount(performances, songs, 10, originals);

    expect(top.map((t) => [t.subject.title, t.count])).toEqual([
      ['Georgia On My Coast', 3],
      ['A Cover', 1],
    ]);
  });
});
