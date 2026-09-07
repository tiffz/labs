import { describe, expect, it } from 'vitest';
import type { EncorePerformance, EncoreSong } from '../types';
import { normalizeVenueTag } from '../components/libraryScreenHelpers';
import {
  derivePlaylistImportTagsFromFilters,
  filterSongsByRepertoireSavedSearchBundle,
  normalizeExcludedRepertoireFieldIds,
  normalizeSavedSearchFilterValues,
} from './repertoireSavedSearchFilter';

function fv(partial: Record<string, string[]>): Record<string, string[]> {
  return normalizeSavedSearchFilterValues(partial);
}

const NOW = '2026-05-06T16:00:00.000Z';

function song(partial: Partial<EncoreSong> & { id: string; title: string; artist: string }): EncoreSong {
  return {
    journalMarkdown: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function perf(partial: Partial<EncorePerformance> & { id: string; songId: string; venueTag: string }): EncorePerformance {
  return {
    date: '2026-05-01',
    notes: '',
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function buildPerfBySong(perfs: EncorePerformance[]): Map<string, EncorePerformance[]> {
  const m = new Map<string, EncorePerformance[]>();
  for (const p of perfs) {
    const list = m.get(p.songId) ?? [];
    list.push(p);
    m.set(p.songId, list);
  }
  return m;
}

describe('filterSongsByRepertoireSavedSearchBundle exclude semantics', () => {
  const a = song({ id: 'a', title: 'Aria', artist: 'Composer X' });
  const b = song({ id: 'b', title: 'Ballad', artist: 'Composer Y' });
  const c = song({ id: 'c', title: 'Cantata', artist: 'Composer Z' });
  const songs = [a, b, c];

  const perfA1 = perf({ id: 'p1', songId: 'a', venueTag: normalizeVenueTag('Martuni\'s') });
  const perfA2 = perf({ id: 'p2', songId: 'a', venueTag: normalizeVenueTag('Google') });
  const perfB1 = perf({ id: 'p3', songId: 'b', venueTag: normalizeVenueTag('Google') });
  // c has no performances
  const performances = [perfA1, perfA2, perfB1];
  const perfBySong = buildPerfBySong(performances);

  it('include venue (default) keeps only songs performed at the chosen venue', () => {
    const out = filterSongsByRepertoireSavedSearchBundle(
      songs,
      performances,
      perfBySong,
      [],
      '',
      fv({ venue: [normalizeVenueTag('Martuni\'s')], performed: ['with'] }),
    );
    expect(out.map((s) => s.id)).toEqual(['a']);
  });

  it('exclude venue keeps songs that have NOT been performed at the chosen venue', () => {
    const out = filterSongsByRepertoireSavedSearchBundle(
      songs,
      performances,
      perfBySong,
      [],
      '',
      fv({ venue: [normalizeVenueTag('Martuni\'s')], performed: ['with'] }),
      ['venue'],
    );
    expect(out.map((s) => s.id)).toEqual(['b']);
  });

  it('exclude tags keeps songs that do NOT carry any of the chosen tags', () => {
    const tagged = [
      { ...a, tags: ['rock', 'show'] },
      { ...b, tags: ['ballad'] },
      { ...c, tags: [] },
    ];
    const out = filterSongsByRepertoireSavedSearchBundle(
      tagged,
      [],
      new Map(),
      [],
      '',
      fv({ tags: ['rock'] }),
      ['tags'],
    );
    expect(out.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('exclude artist removes the named artist from results', () => {
    const out = filterSongsByRepertoireSavedSearchBundle(
      songs,
      [],
      new Map(),
      [],
      '',
      fv({ artist: ['Composer X'] }),
      ['artist'],
    );
    expect(out.map((s) => s.id)).toEqual(['b', 'c']);
  });

  it('ignores excludedFieldIds entries that do not opt into exclude', () => {
    const out = filterSongsByRepertoireSavedSearchBundle(
      songs,
      performances,
      perfBySong,
      [],
      '',
      fv({ performed: ['with'] }),
      ['performed'],
    );
    expect(out.map((s) => s.id).sort()).toEqual(['a', 'b']);
  });
});

describe('normalizeExcludedRepertoireFieldIds', () => {
  it('keeps only ids that the filter knows how to invert', () => {
    expect(normalizeExcludedRepertoireFieldIds(['venue', 'tags', 'milestoneWhich', 'performed'])).toEqual(
      expect.arrayContaining(['venue', 'tags']),
    );
    expect(normalizeExcludedRepertoireFieldIds(undefined)).toEqual([]);
    expect(normalizeExcludedRepertoireFieldIds(['venue', 'venue'])).toEqual(['venue']);
  });
});

describe('derivePlaylistImportTagsFromFilters', () => {
  it('returns the single concrete tag when not excluded', () => {
    expect(derivePlaylistImportTagsFromFilters({ tags: ['gigs'] })).toEqual(['gigs']);
  });

  it('returns undefined when the tag field is excluded (the saved search is "songs without this tag")', () => {
    expect(derivePlaylistImportTagsFromFilters({ tags: ['gigs'] }, ['tags'])).toBeUndefined();
  });

  it('returns undefined when no concrete tags are selected', () => {
    expect(derivePlaylistImportTagsFromFilters({ tags: [] })).toBeUndefined();
  });
});

describe('songRole filter', () => {
  const led = song({ id: 'led', title: 'Led', artist: 'A' });
  const supported = song({ id: 'supported', title: 'Supported', artist: 'A' });
  const never = song({ id: 'never', title: 'Never performed', artist: 'A' });
  const songs = [led, supported, never];
  const performances = [
    perf({ id: 'p1', songId: 'led', venueTag: 'V' }),
    { ...perf({ id: 'p2', songId: 'supported', venueTag: 'V' }), role: 'Accompanist' as const },
  ];
  const perfBySong = buildPerfBySong(performances);

  function run(values: Record<string, string[]>) {
    return filterSongsByRepertoireSavedSearchBundle(
      songs,
      performances,
      perfBySong,
      [],
      '',
      fv(values),
    ).map((s) => s.id);
  }

  it('is a no-op when unset, so existing saved searches are unchanged', () => {
    // This function also drives Spotify playlist sync; a predicate that changed meaning for an
    // existing saved search would quietly change a synced playlist's contents.
    expect(run({})).toEqual(['led', 'supported', 'never']);
  });

  it('keeps only songs she has led', () => {
    expect(run({ songRole: ['led'] })).toEqual(['led']);
  });

  it('keeps only songs she has never led but has performed', () => {
    expect(run({ songRole: ['supported'] })).toEqual(['supported']);
  });

  it('treats a performance with no role as led', () => {
    // Absent means Lead vocal, so the whole back catalogue counts as led.
    expect(run({ songRole: ['led'] })).toContain('led');
  });

  it('excludes never-performed songs from both sides', () => {
    expect(run({ songRole: ['led'] })).not.toContain('never');
    expect(run({ songRole: ['supported'] })).not.toContain('never');
  });

  it('counts a song as led when any one performance was led', () => {
    const mixed = [
      perf({ id: 'm1', songId: 'supported', venueTag: 'V' }),
      { ...perf({ id: 'm2', songId: 'supported', venueTag: 'V' }), role: 'Accompanist' as const },
    ];
    const out = filterSongsByRepertoireSavedSearchBundle(
      [supported], mixed, buildPerfBySong(mixed), [], '', fv({ songRole: ['led'] }),
    );
    expect(out.map((s) => s.id)).toEqual(['supported']);
  });
});
