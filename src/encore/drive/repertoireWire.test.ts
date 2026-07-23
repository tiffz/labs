import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import { normalizeSavedSearchFilterValues } from '../repertoire/repertoireSavedSearchFilter';
import {
  buildWireFromTables,
  defaultRepertoireExtrasRow,
  mergeRecordsByUpdatedAt,
  mergeRepertoireExtras,
  parseRepertoireWire,
  repertoireExtrasFromWire,
  serializeRepertoireWire,
} from './repertoireWire';

describe('parseRepertoireWire', () => {
  it('parses valid payload', () => {
    const extras = defaultRepertoireExtrasRow(new Date().toISOString());
    const wire = buildWireFromTables([], [], extras);
    const round = parseRepertoireWire(serializeRepertoireWire(wire));
    expect(round.songs).toEqual([]);
    expect(round.performances).toEqual([]);
    expect(round.venueCatalog).toEqual([]);
    expect(round.milestoneTemplate).toEqual([]);
  });

  it('round-trips tableUi preferences', () => {
    const iso = new Date().toISOString();
    const extras = {
      ...defaultRepertoireExtrasRow(iso),
      tableUi: {
        repertoire: {
          columnVisibility: { artist: false },
          columnOrder: ['title', 'artist', 'venues'],
          sorting: [{ id: 'title', desc: true }],
        },
        performances: {
          columnVisibility: { venue: false },
          sorting: [{ id: 'date', desc: false }],
        },
      },
    };
    const wire = buildWireFromTables([], [], extras);
    const round = parseRepertoireWire(serializeRepertoireWire(wire));
    expect(round.tableUi).toEqual(extras.tableUi);
  });

  it('round-trips repertoireSavedSearches', () => {
    const iso = new Date().toISOString();
    const normalizedFilters = normalizeSavedSearchFilterValues({ tags: ['rock'] });
    const extras = {
      ...defaultRepertoireExtrasRow(iso),
      repertoireSavedSearches: [
        {
          id: 'ss1',
          name: 'Set A',
          updatedAt: iso,
          searchQuery: 'hello',
          visibleFieldIds: ['performed'],
          filterValues: { tags: ['rock'] },
          spotifyPlaylistId: 'pl1',
          playlistImportTags: ['rock'],
        },
      ],
    };
    const wire = buildWireFromTables([], [], extras);
    const round = parseRepertoireWire(serializeRepertoireWire(wire));
    expect(round.repertoireSavedSearches).toEqual([
      {
        id: 'ss1',
        name: 'Set A',
        updatedAt: iso,
        searchQuery: 'hello',
        visibleFieldIds: ['performed'],
        filterValues: normalizedFilters,
        spotifyPlaylistId: 'pl1',
        playlistImportTags: ['rock'],
      },
    ]);
    const row = repertoireExtrasFromWire(round);
    expect(row.repertoireSavedSearches).toEqual(round.repertoireSavedSearches);
  });

  it('round-trips excludedFieldIds for saved searches', () => {
    const iso = new Date().toISOString();
    const extras = {
      ...defaultRepertoireExtrasRow(iso),
      repertoireSavedSearches: [
        {
          id: 'ss1',
          name: 'Not at Martuni\'s',
          updatedAt: iso,
          searchQuery: '',
          visibleFieldIds: ['performed', 'venue'],
          filterValues: { performed: ['with'], venue: ['martunis'] },
          excludedFieldIds: ['venue'],
        },
      ],
    };
    const wire = buildWireFromTables([], [], extras);
    const round = parseRepertoireWire(serializeRepertoireWire(wire));
    expect(round.repertoireSavedSearches?.[0]?.excludedFieldIds).toEqual(['venue']);
  });

  it('drops excludedFieldIds entries that do not support exclude', () => {
    const iso = new Date().toISOString();
    const extras = {
      ...defaultRepertoireExtrasRow(iso),
      repertoireSavedSearches: [
        {
          id: 'ss1',
          name: 'Bad ids',
          updatedAt: iso,
          searchQuery: '',
          visibleFieldIds: ['venue'],
          filterValues: { venue: ['x'] },
          excludedFieldIds: ['venue', 'performed', 'milestoneDoneMin'],
        },
      ],
    };
    const wire = buildWireFromTables([], [], extras);
    const round = parseRepertoireWire(serializeRepertoireWire(wire));
    expect(round.repertoireSavedSearches?.[0]?.excludedFieldIds).toEqual(['venue']);
  });

  it('rejects invalid', () => {
    expect(() => parseRepertoireWire('{}')).toThrow();
  });
});

describe('mergeRecordsByUpdatedAt', () => {
  it('keeps newer updatedAt per id', () => {
    const a: EncoreSong = {
      id: '1',
      title: 'A',
      artist: 'X',
      journalMarkdown: '',
      createdAt: '2020-01-01',
      updatedAt: '2020-01-02',
    };
    const b: EncoreSong = { ...a, title: 'B', updatedAt: '2020-01-03' };
    const merged = mergeRecordsByUpdatedAt<EncoreSong>([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.title).toBe('B');
  });
});

describe('song/performance delete tombstones (P0-1, clocked)', () => {
  it('round-trips the id -> deletedAt tombstone maps through the wire', () => {
    const iso = '2025-06-01T00:00:00.000Z';
    const extras = {
      ...defaultRepertoireExtrasRow(iso),
      deletedSongIds: { s1: iso, s2: iso },
      deletedPerformanceIds: { p9: iso },
    };
    const round = parseRepertoireWire(serializeRepertoireWire(buildWireFromTables([], [], extras)));
    expect(round.deletedSongIds).toEqual({ s1: iso, s2: iso });
    expect(round.deletedPerformanceIds).toEqual({ p9: iso });
  });

  it('migrates a legacy id-only array wire to the clock map (deletedAt = exportedAt)', () => {
    const wire = parseRepertoireWire(
      JSON.stringify({
        version: 1,
        exportedAt: '2025-06-01T00:00:00.000Z',
        songs: [],
        performances: [],
        deletedSongIds: ['x'],
        deletedPerformanceIds: ['y'],
      }),
    );
    const row = repertoireExtrasFromWire(wire);
    expect(row.deletedSongIds).toEqual({ x: '2025-06-01T00:00:00.000Z' });
    expect(row.deletedPerformanceIds).toEqual({ y: '2025-06-01T00:00:00.000Z' });
  });

  it('mergeRepertoireExtras unions tombstones and keeps the latest deletedAt per id', () => {
    const a = {
      ...defaultRepertoireExtrasRow('2025-06-01T00:00:00.000Z'),
      deletedSongIds: { s1: '2025-01-01T00:00:00.000Z', shared: '2025-01-01T00:00:00.000Z' },
    };
    const b = {
      ...defaultRepertoireExtrasRow('2025-06-02T00:00:00.000Z'),
      deletedSongIds: { s2: '2025-01-01T00:00:00.000Z', shared: '2025-09-09T00:00:00.000Z' },
    };
    const merged = mergeRepertoireExtras(a, b);
    expect(Object.keys(merged.deletedSongIds ?? {}).sort()).toEqual(['s1', 's2', 'shared']);
    expect(merged.deletedSongIds?.shared).toBe('2025-09-09T00:00:00.000Z'); // latest wins
  });

  it('drops blank ids on parse', () => {
    const wire = parseRepertoireWire(
      JSON.stringify({
        version: 1,
        exportedAt: '2025-06-01T00:00:00.000Z',
        songs: [],
        performances: [],
        deletedSongIds: ['', '  ', 'ok'],
      }),
    );
    expect(Object.keys(wire.deletedSongIds ?? {})).toEqual(['ok']);
  });
});
