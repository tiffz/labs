import { describe, expect, it } from 'vitest';
import {
  isOriginalPerformance,
  performanceSubjectKey,
  resolvePerformanceSubject,
} from './performanceSubject';
import type { EncorePerformance, EncoreSong } from '../types';
import type { EncoreOriginalSong } from '../originals/types';

function song(id: string, title: string, artist: string): EncoreSong {
  return {
    id,
    title,
    artist,
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

function perf(overrides: Partial<EncorePerformance>): EncorePerformance {
  return {
    id: 'p1',
    songId: 's1',
    date: '2026-06-01',
    venueTag: 'Club',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

const songs = new Map([['s1', song('s1', 'Because of You', 'Kelly Clarkson')]]);
const originals = new Map([['o1', original('o1', 'Georgia On My Coast')]]);

describe('resolvePerformanceSubject', () => {
  it('resolves a repertoire song when subjectKind is absent (every pre-existing row)', () => {
    const subject = resolvePerformanceSubject(perf({}), songs, originals);
    expect(subject).toEqual({
      kind: 'song',
      id: 's1',
      title: 'Because of You',
      artist: 'Kelly Clarkson',
      href: '#/song/s1',
    });
  });

  it('resolves an original and links to its songwriting page', () => {
    const subject = resolvePerformanceSubject(
      perf({ songId: 'o1', subjectKind: 'original' }),
      songs,
      originals,
    );
    expect(subject).toEqual({
      kind: 'original',
      id: 'o1',
      title: 'Georgia On My Coast',
      artist: '',
      href: '#/originals/o1',
    });
  });

  it('never fabricates an artist for an original', () => {
    // Substituting the owner's name would be authorship metadata she never wrote.
    const subject = resolvePerformanceSubject(
      perf({ songId: 'o1', subjectKind: 'original' }),
      songs,
      originals,
    );
    expect(subject.artist).toBe('');
  });

  it('degrades to unknown when an original was deleted, rather than throwing or orphaning', () => {
    // Deleting an original deliberately does NOT cascade — performance history is irreplaceable,
    // a dangling pointer is not. The row must stay renderable.
    const subject = resolvePerformanceSubject(
      perf({ songId: 'gone', subjectKind: 'original' }),
      songs,
      originals,
    );
    expect(subject.kind).toBe('unknown');
    expect(subject.title).toBe('Unknown song');
    expect(subject.href).toBeNull();
  });

  it('degrades to unknown when a repertoire song is missing on this device', () => {
    const subject = resolvePerformanceSubject(perf({ songId: 'nope' }), songs, originals);
    expect(subject.kind).toBe('unknown');
  });

  it('does not read an original out of the songs map, or vice versa', () => {
    // The discriminant, not the id, decides which table to look in.
    expect(resolvePerformanceSubject(perf({ songId: 's1', subjectKind: 'original' }), songs, originals).kind).toBe(
      'unknown',
    );
    expect(resolvePerformanceSubject(perf({ songId: 'o1' }), songs, originals).kind).toBe('unknown');
  });

  it('tolerates a missing originals map (surfaces that only pass songs)', () => {
    expect(resolvePerformanceSubject(perf({ songId: 'o1', subjectKind: 'original' }), songs).kind).toBe(
      'unknown',
    );
  });
});

describe('performanceSubjectKey', () => {
  it('separates a song and an original that share an id', () => {
    expect(performanceSubjectKey(perf({ songId: 'x' }))).toBe('song:x');
    expect(performanceSubjectKey(perf({ songId: 'x', subjectKind: 'original' }))).toBe('original:x');
  });

  it('treats an absent kind as a song so pre-existing rows group unchanged', () => {
    expect(performanceSubjectKey(perf({ songId: 'x', subjectKind: 'song' }))).toBe(
      performanceSubjectKey(perf({ songId: 'x' })),
    );
  });
});

describe('isOriginalPerformance', () => {
  it('is derived from the pointer, so it can never drift like a stored tag', () => {
    expect(isOriginalPerformance(perf({ subjectKind: 'original' }))).toBe(true);
    expect(isOriginalPerformance(perf({ subjectKind: 'song' }))).toBe(false);
    expect(isOriginalPerformance(perf({}))).toBe(false);
  });
});
