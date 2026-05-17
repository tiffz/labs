import { describe, expect, it } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../../types';
import {
  buildPerfBySongMap,
  partitionAddToPracticeResults,
} from './addToPracticeSearch';

const ISO = '2026-01-01T00:00:00.000Z';

function song(overrides: Partial<EncoreSong> & Pick<EncoreSong, 'id' | 'title' | 'artist'>): EncoreSong {
  return {
    journalMarkdown: '',
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function perf(songId: string, overrides: Partial<EncorePerformance> = {}): EncorePerformance {
  return {
    id: `${songId}-${overrides.date ?? '2026-01-01'}`,
    songId,
    date: '2026-01-01',
    venueTag: '',
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

describe('partitionAddToPracticeResults', () => {
  const yesterday = song({ id: 'a', title: 'Yesterday', artist: 'The Beatles', practicing: true });
  const heyJude = song({ id: 'b', title: 'Hey Jude', artist: 'The Beatles' });
  const letItBe = song({ id: 'c', title: 'Let It Be', artist: 'The Beatles', tags: ['ballad'] });
  const valerie = song({ id: 'd', title: 'Valerie', artist: 'Amy Winehouse', performanceKey: 'C' });
  const songs = [yesterday, heyJude, letItBe, valerie];
  const empty = new Map<string, EncorePerformance[]>();

  it('returns all songs partitioned by practicing flag when query is empty', () => {
    const { available, alreadyPracticing } = partitionAddToPracticeResults(songs, '', empty);
    expect(available.map((s) => s.id)).toEqual(['b', 'c', 'd']);
    expect(alreadyPracticing.map((s) => s.id)).toEqual(['a']);
  });

  it('sorts results alphabetically by title + artist (case-insensitive)', () => {
    const { available } = partitionAddToPracticeResults(songs, '', empty);
    // Hey Jude < Let It Be < Valerie alphabetically
    expect(available.map((s) => s.title)).toEqual(['Hey Jude', 'Let It Be', 'Valerie']);
  });

  it('filters by title substring (case-insensitive)', () => {
    const { available, alreadyPracticing } = partitionAddToPracticeResults(songs, 'JUDE', empty);
    expect(available.map((s) => s.id)).toEqual(['b']);
    expect(alreadyPracticing).toEqual([]);
  });

  it('filters by artist substring', () => {
    const { available, alreadyPracticing } = partitionAddToPracticeResults(songs, 'beatles', empty);
    expect(available.map((s) => s.id)).toEqual(['b', 'c']);
    expect(alreadyPracticing.map((s) => s.id)).toEqual(['a']);
  });

  it('filters by tag value (matches Library search semantics)', () => {
    const { available } = partitionAddToPracticeResults(songs, 'ballad', empty);
    expect(available.map((s) => s.id)).toEqual(['c']);
  });

  it('filters by performance venue / date via perfBySong map', () => {
    const perfs = [perf('b', { venueTag: 'Royal Albert Hall', date: '2025-12-15' })];
    const map = buildPerfBySongMap(perfs);
    const venueHit = partitionAddToPracticeResults(songs, 'albert', map);
    expect(venueHit.available.map((s) => s.id)).toEqual(['b']);
    const dateHit = partitionAddToPracticeResults(songs, '2025-12-15', map);
    expect(dateHit.available.map((s) => s.id)).toEqual(['b']);
  });

  it('filters by performance key', () => {
    const { available } = partitionAddToPracticeResults(songs, 'C', empty);
    // Both "Let It Be" (substring of "Let It Be") and Valerie (perfKey C) would match in theory,
    // but our substring-on-title makes "C" match neither title; only Valerie's perfKey matches.
    expect(available.map((s) => s.id)).toEqual(['d']);
  });

  it('keeps already-practicing songs out of the available bucket even when they match', () => {
    const { available, alreadyPracticing } = partitionAddToPracticeResults(songs, 'yest', empty);
    expect(available).toEqual([]);
    expect(alreadyPracticing.map((s) => s.id)).toEqual(['a']);
  });

  it('returns empty buckets when nothing matches', () => {
    const result = partitionAddToPracticeResults(songs, 'zzz-nope', empty);
    expect(result.available).toEqual([]);
    expect(result.alreadyPracticing).toEqual([]);
  });

  it('trims whitespace queries before matching (empty effective query returns everything)', () => {
    const { available, alreadyPracticing } = partitionAddToPracticeResults(songs, '   ', empty);
    expect(available.length + alreadyPracticing.length).toBe(songs.length);
  });
});

describe('buildPerfBySongMap', () => {
  it('groups performances by songId', () => {
    const performances = [
      perf('a', { id: 'a-1', date: '2025-01-01' }),
      perf('a', { id: 'a-2', date: '2025-02-01' }),
      perf('b', { id: 'b-1' }),
    ];
    const map = buildPerfBySongMap(performances);
    expect(map.get('a')?.map((p) => p.id)).toEqual(['a-1', 'a-2']);
    expect(map.get('b')?.map((p) => p.id)).toEqual(['b-1']);
    expect(map.get('c')).toBeUndefined();
  });

  it('returns an empty map for no performances', () => {
    expect(buildPerfBySongMap([]).size).toBe(0);
  });
});
