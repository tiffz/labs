import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { stanzaDb, type StanzaSong, type StanzaTake } from '../db/stanzaDb';
import {
  readStanzaLastSelectedSongId,
  writeStanzaLastSelectedSongId,
} from '../db/stanzaLastSelectedSong';
import {
  buildStanzaDriveEnvelope,
  parseStanzaDriveEnvelope,
  serializeStanzaDriveEnvelope,
} from '../drive/stanzaDriveEnvelope';
import { mergeDriveRowsIntoLocalLibrary } from '../drive/stanzaDriveMerge';
import {
  clearAllStanzaDriveTombstonesForTesting,
  getStanzaDriveTombstoneFileIds,
} from '../drive/stanzaDriveTombstones';
import {
  clearAllStanzaLocalSongTombstonesForTesting,
  getStanzaLocalSongTombstoneIds,
} from '../drive/stanzaLocalSongTombstones';
import { getStanzaYoutubeTombstoneVideoIds } from '../drive/stanzaYoutubeTombstones';
import { applyStanzaOrganizeMerge } from './stanzaOrganizeApply';

function song(overrides: Partial<StanzaSong> & { id: string }): StanzaSong {
  return {
    ytId: null,
    title: 'Untitled',
    markers: [],
    stats: {},
    updatedAt: 0,
    ...overrides,
  } as StanzaSong;
}

function take(id: string, songId: string, segmentId: string): StanzaTake {
  return { id, songId, segmentId, blob: new Blob(['take']), isGuided: false, createdAt: 1 };
}

async function seed(rows: StanzaSong[], takes: StanzaTake[] = []): Promise<void> {
  await stanzaDb.songs.bulkPut(rows);
  if (takes.length) await stanzaDb.takes.bulkPut(takes);
}

beforeEach(async () => {
  window.localStorage.clear();
  await stanzaDb.songs.clear();
  await stanzaDb.takes.clear();
  await stanzaDb.undoSnapshots.clear();
});

afterEach(() => {
  clearAllStanzaDriveTombstonesForTesting();
  clearAllStanzaLocalSongTombstonesForTesting();
});

describe('applyStanzaOrganizeMerge — writes', () => {
  it('applies a same-source merge, remaps takes, writes a pre-merge snapshot', async () => {
    await seed(
      [
        song({ id: 'a', ytId: 'vid1', title: 'Song', updatedAt: 200 }),
        song({ id: 'b', ytId: 'vid1', title: 'Song', updatedAt: 100 }),
      ],
      [take('t1', 'b', 'seg1')],
    );

    const { report } = await applyStanzaOrganizeMerge([
      { memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' },
    ]);

    expect(report.mergedGroups).toBe(1);
    expect(report.droppedRows).toBe(1);
    expect(report.takesRemapped).toBe(1);
    expect(await stanzaDb.songs.get('b')).toBeUndefined();
    expect(await stanzaDb.songs.get('a')).toBeTruthy();
    expect((await stanzaDb.takes.get('t1'))?.songId).toBe('a');
    // Durable pre-merge snapshot written.
    const snaps = await stanzaDb.undoSnapshots.toArray();
    expect(snaps.some((s) => s.trigger === 'pre-merge')).toBe(true);
  });

  it('drops donor takes on a cross-source merge and tombstones the discarded source', async () => {
    await seed(
      [
        song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
        song({ id: 'b', ytId: 'vidB', title: 'Song', updatedAt: 100 }),
      ],
      [take('ta', 'a', 'segA'), take('tb', 'b', 'segB')],
    );

    const { report } = await applyStanzaOrganizeMerge([
      { memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' },
    ]);

    expect(report.takesDropped).toBe(1);
    expect(await stanzaDb.takes.get('tb')).toBeUndefined();
    expect(await stanzaDb.takes.get('ta')).toBeTruthy();
    expect(getStanzaYoutubeTombstoneVideoIds().has('vidB')).toBe(true);
  });

  it('remaps stanzaLastSelectedSongId off a dropped row', async () => {
    await seed([
      song({ id: 'a', ytId: 'vid1', title: 'Song', updatedAt: 200 }),
      song({ id: 'b', ytId: 'vid1', title: 'Song', updatedAt: 100 }),
    ]);
    writeStanzaLastSelectedSongId('b');

    await applyStanzaOrganizeMerge([{ memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' }]);
    expect(readStanzaLastSelectedSongId()).toBe('a');
  });

  it('refuses an unsafe group and writes nothing', async () => {
    await seed([
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        title: 'Song',
        updatedAt: 100,
        localAudioBlob: new Blob(['bytes']),
        localMediaFingerprint: '5000:200.00',
      }),
    ]);

    const { report } = await applyStanzaOrganizeMerge([
      { memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' },
    ]);

    expect(report.mergedGroups).toBe(0);
    expect(report.refusals).toHaveLength(1);
    expect(await stanzaDb.songs.get('b')).toBeTruthy();
    // No snapshot for a no-op apply.
    expect((await stanzaDb.undoSnapshots.toArray()).length).toBe(0);
  });
});

describe('applyStanzaOrganizeMerge — two-layer undo', () => {
  it('undo restores the pre-merge library, redo re-applies', async () => {
    await seed(
      [
        song({ id: 'a', ytId: 'vid1', title: 'Song', updatedAt: 200 }),
        song({ id: 'b', ytId: 'vid1', title: 'Song', updatedAt: 100 }),
      ],
      [take('t1', 'b', 'seg1')],
    );

    const { undo, redo } = await applyStanzaOrganizeMerge([
      { memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' },
    ]);
    expect(await stanzaDb.songs.get('b')).toBeUndefined();

    await undo();
    expect(await stanzaDb.songs.get('b')).toBeTruthy();
    expect((await stanzaDb.takes.get('t1'))?.songId).toBe('b');

    await redo();
    expect(await stanzaDb.songs.get('b')).toBeUndefined();
    expect((await stanzaDb.takes.get('t1'))?.songId).toBe('a');
  });

  it('undo clears the tombstones the merge added', async () => {
    await seed([
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({ id: 'b', ytId: 'vidB', title: 'Song', updatedAt: 100 }),
    ]);

    const { undo } = await applyStanzaOrganizeMerge([
      { memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' },
    ]);
    expect(getStanzaYoutubeTombstoneVideoIds().has('vidB')).toBe(true);

    await undo();
    expect(getStanzaYoutubeTombstoneVideoIds().has('vidB')).toBe(false);
  });
});

describe('fitness: drop -> tombstone -> no resurrection (ADR 0027)', () => {
  it('a merged-away keyless local row stays gone across a Drive pull that still lists it', async () => {
    // A = YouTube row; B = metadata-only local upload (fingerprint + markers, no bytes yet) — the
    // shape a sibling device syncs. They are the same song from different sources (cross-source).
    const a = song({
      id: 'a',
      ytId: 'vidA',
      title: 'Song',
      markers: [{ id: 'm1', time: 10, label: 'V' }],
      updatedAt: 200,
    });
    const b = song({
      id: 'b',
      title: 'Song',
      markers: [{ id: 'm2', time: 12, label: 'V' }],
      localMediaFingerprint: '5000:200.00',
      updatedAt: 100,
    });
    await seed([a, b]);

    // Capture the Drive envelope BEFORE the merge — Drive still lists both A and B.
    const staleEnvelope = await buildStanzaDriveEnvelope();

    await applyStanzaOrganizeMerge([{ memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' }]);
    expect(await stanzaDb.songs.get('b')).toBeUndefined();
    expect(getStanzaLocalSongTombstoneIds().has('b')).toBe(true);

    const localRows = await stanzaDb.songs.toArray();

    // Control: WITHOUT the tombstone, B resurrects from its Drive metadata (blob-less broken row).
    const resurrected = mergeDriveRowsIntoLocalLibrary(localRows, staleEnvelope.songs, {});
    expect(resurrected.nextRows.some((r) => r.id === 'b')).toBe(true);

    // With the id-level tombstone, the merge filter keeps B dropped.
    const filtered = mergeDriveRowsIntoLocalLibrary(localRows, staleEnvelope.songs, {
      localSongTombstoneIds: getStanzaLocalSongTombstoneIds(),
    });
    expect(filtered.nextRows.some((r) => r.id === 'b')).toBe(false);
  });
});

describe('envelope carries the new tombstones', () => {
  it('round-trips deletedLocalSongIds and deletedYoutubeVideoIds through parse', async () => {
    await seed([
      song({ id: 'a', ytId: 'vidA', title: 'Song', updatedAt: 200 }),
      song({
        id: 'b',
        title: 'Song',
        markers: [{ id: 'm', time: 5, label: 'V' }],
        localMediaFingerprint: '9:9.00',
        updatedAt: 100,
      }),
      song({ id: 'c', ytId: 'vidC', title: 'Song', updatedAt: 90 }),
    ]);
    // Two sequential merges: drop a keyless-local (b) and a YouTube source (c) into survivor a.
    await applyStanzaOrganizeMerge([{ memberIds: ['a', 'b'], canonicalId: 'a', playFromId: 'a' }]);
    await applyStanzaOrganizeMerge([{ memberIds: ['a', 'c'], canonicalId: 'a', playFromId: 'a' }]);

    const parsed = parseStanzaDriveEnvelope(
      serializeStanzaDriveEnvelope(await buildStanzaDriveEnvelope()),
    );
    expect(parsed.deletedLocalSongIds?.some((t) => t.songId === 'b')).toBe(true);
    expect(parsed.deletedYoutubeVideoIds?.some((t) => t.videoId === 'vidC')).toBe(true);
    expect(getStanzaDriveTombstoneFileIds().size).toBe(0);
  });
});
