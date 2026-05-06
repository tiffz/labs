import { describe, expect, it } from 'vitest';
import type { EncoreSong } from '../types';
import { normalizeSavedSearchFilterValues } from '../repertoire/repertoireSavedSearchFilter';
import {
  buildWireFromTables,
  defaultRepertoireExtrasRow,
  mergeRecordsByUpdatedAt,
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
