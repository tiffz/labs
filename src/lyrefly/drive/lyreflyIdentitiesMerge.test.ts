// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { lyreflyDb } from '../db/lyreflyDb';
import { createBlankComicProject } from '../types';
import type { LyreflyIdentities } from '../types';
import { buildLyreflyDriveEnvelope, envelopeToPayload, parseLyreflyDriveEnvelope, serializeLyreflyDriveEnvelope } from './lyreflyDriveEnvelope';
import { mergeLyreflySyncPayload } from './lyreflyDriveMerge';
import { mergeLyreflyIdentities } from './lyreflyIdentitiesMerge';
import { readLyreflyLocalPayload, writeLyreflyLocalPayload } from './lyreflyLocalData';
import { mergeLyreflyProjectFields } from './lyreflyPackageFieldMerge';

const T0 = '2026-10-01T00:00:00.000Z';
const T1 = '2026-10-02T00:00:00.000Z';

const tiffatiel = { id: 'p1', name: 'Tiffatiel', updatedAt: T0 };
const petrichor = { id: 'p2', name: 'Petrichor Lin', updatedAt: T0 };
const walks = { id: 's1', title: 'Between Walks', updatedAt: T0 };
const bsky = {
  id: 'a1',
  platform: 'Bluesky',
  handle: 'tiffatiel.bsky.social',
  url: 'https://bsky.app/profile/tiffatiel.bsky.social',
  owner: { kind: 'persona' as const, id: 'p1' },
  updatedAt: T0,
};

const ids = (i: LyreflyIdentities) => ({
  personas: i.personas.map((r) => r.id).sort(),
  series: i.series.map((r) => r.id).sort(),
  accounts: i.accounts.map((r) => r.id).sort(),
});

beforeEach(async () => {
  await Promise.all(lyreflyDb.tables.map((table) => table.clear()));
});

describe('mergeLyreflyIdentities', () => {
  it('keeps rows only one side has', () => {
    const merged = mergeLyreflyIdentities(
      { personas: [tiffatiel], series: [walks], accounts: [] },
      { personas: [petrichor], series: [], accounts: [bsky] },
    );
    expect(ids(merged)).toEqual({ personas: ['p1', 'p2'], series: ['s1'], accounts: ['a1'] });
  });

  it('the newer edit of a row wins, from either side', () => {
    const renamed = { ...walks, title: 'Between Walks (dogs)', updatedAt: T1 };
    expect(mergeLyreflyIdentities({ personas: [], series: [walks], accounts: [] }, { personas: [], series: [renamed], accounts: [] }).series).toEqual([renamed]);
    expect(mergeLyreflyIdentities({ personas: [], series: [renamed], accounts: [] }, { personas: [], series: [walks], accounts: [] }).series).toEqual([renamed]);
  });

  it('a retire is an edit, so it syncs like one', () => {
    const retired = { ...bsky, retiredAt: T1, updatedAt: T1 };
    expect(mergeLyreflyIdentities({ personas: [], series: [], accounts: [bsky] }, { personas: [], series: [], accounts: [retired] }).accounts).toEqual([retired]);
  });
});

describe('identities through the gallery backup', () => {
  it('survive a round trip through progress.json', () => {
    const identities = { personas: [tiffatiel], series: [walks], accounts: [bsky] };
    const envelope = parseLyreflyDriveEnvelope(serializeLyreflyDriveEnvelope(buildLyreflyDriveEnvelope({ projects: [], identities })));
    expect(envelopeToPayload(envelope).identities).toEqual(identities);
  });

  it('a backup written before identities existed does not erase this device’s', async () => {
    await lyreflyDb.personas.put(tiffatiel);
    await lyreflyDb.accounts.put(bsky);
    const oldBackup = { projects: [] }; // no identities field at all
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), oldBackup);
    await writeLyreflyLocalPayload(payload);
    expect(ids((await readLyreflyLocalPayload()).identities!)).toEqual({ personas: ['p1'], series: [], accounts: ['a1'] });
  });

  it('a newer local edit survives an older copy on Drive', async () => {
    const renamedHere = { ...walks, title: 'Between Walks (dogs)', updatedAt: T1 };
    await lyreflyDb.series.put(renamedHere);
    const remote = { projects: [], identities: { personas: [], series: [walks], accounts: [] } };
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), remote);
    await writeLyreflyLocalPayload(payload);
    expect(await lyreflyDb.series.get('s1')).toEqual(renamedHere);
  });

  it('an edit made while a sync is running survives that sync writing back', async () => {
    await lyreflyDb.series.put(walks);
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), { projects: [] });
    // The user renames the series after the sync read local state but before it writes.
    const renamedMidSync = { ...walks, title: 'Between Walks (dogs)', updatedAt: T1 };
    await lyreflyDb.series.put(renamedMidSync);
    await writeLyreflyLocalPayload(payload);
    expect(await lyreflyDb.series.get('s1')).toEqual(renamedMidSync);
  });

  it('rows from another device land in this one', async () => {
    await lyreflyDb.personas.put(tiffatiel);
    const remote = { projects: [], identities: { personas: [petrichor], series: [walks], accounts: [bsky] } };
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), remote);
    await writeLyreflyLocalPayload(payload);
    expect(ids((await readLyreflyLocalPayload()).identities!)).toEqual({ personas: ['p1', 'p2'], series: ['s1'], accounts: ['a1'] });
  });
});

describe('a comic’s credit, series and import key across devices', () => {
  const base = createBlankComicProject(T0);

  it('a side that never set a credit or series does not erase the other side’s', () => {
    const credited = { ...base, personaIds: ['p1'], seriesId: 's1', updatedAt: T0 };
    const newerButBlank = { ...base, title: 'Retitled', updatedAt: T1 };
    const merged = mergeLyreflyProjectFields(credited, newerButBlank);
    expect(merged.personaIds).toEqual(['p1']);
    expect(merged.seriesId).toBe('s1');
    expect(merged.title).toBe('Retitled');
  });

  it('the newer credit wins when both sides set one', () => {
    const older = { ...base, personaIds: ['p1'], updatedAt: T0 };
    const newer = { ...base, personaIds: ['p2'], updatedAt: T1 };
    expect(mergeLyreflyProjectFields(older, newer).personaIds).toEqual(['p2']);
    expect(mergeLyreflyProjectFields(newer, older).personaIds).toEqual(['p2']);
  });

  it('a newer deliberate "no series" or "no credit" wins over an older choice', () => {
    const older = { ...base, personaIds: ['p1'], seriesId: 's1', updatedAt: T0 };
    const cleared = { ...base, personaIds: [], seriesId: null, updatedAt: T1 };
    expect(mergeLyreflyProjectFields(older, cleared)).toMatchObject({ personaIds: [], seriesId: null });
    expect(mergeLyreflyProjectFields(cleared, older)).toMatchObject({ personaIds: [], seriesId: null });
  });

  it('the import key, once set, is never lost', () => {
    const imported = { ...base, importKey: 'tiffatiel.com:perfect-wedding', updatedAt: T0 };
    expect(mergeLyreflyProjectFields({ ...base, updatedAt: T1 }, imported).importKey).toBe('tiffatiel.com:perfect-wedding');
  });
});
