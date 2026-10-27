// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveListFiles: vi.fn(),
  driveCreateFolder: vi.fn(async () => ({ id: 'collections-folder' })),
  driveCreateJsonFile: vi.fn(),
  driveGetMediaBlob: vi.fn(),
  driveResolveThumbnailLink: vi.fn(),
  // Everything that could change an original. None may be called.
  driveTrashFile: vi.fn(),
  driveRenameFile: vi.fn(),
  driveMoveFile: vi.fn(),
  drivePatchJsonMedia: vi.fn(),
  drivePatchFileDescription: vi.fn(),
}));
vi.mock('../../shared/drive/importDriveFile', () => ({
  planDriveFileImport: vi.fn(),
  executeDriveFileImport: vi.fn(),
}));
vi.mock('../../shared/drive/labsDrivePortfolioLayout', () => ({
  LABS_DRIVE_APP_FOLDER_LYREFLY: 'Lyrefly',
  ensureLabsDrivePortfolioProgressLayout: vi.fn(async () => ({ rootFolderId: 'r', appFolderId: 'app', progressFileId: 'p' })),
}));

import * as driveFetch from '../../shared/drive/driveFetch';
import { executeDriveFileImport, planDriveFileImport } from '../../shared/drive/importDriveFile';
import { mergeLyreflySyncPayload } from '../drive/lyreflyDriveMerge';
import { buildLyreflyDriveEnvelope, envelopeToPayload, parseLyreflyDriveEnvelope, serializeLyreflyDriveEnvelope } from '../drive/lyreflyDriveEnvelope';
import { readLyreflyLocalPayload, writeLyreflyLocalPayload } from '../drive/lyreflyLocalData';
import { mergeLyreflyCollections } from '../drive/lyreflyCollectionsSync';
import type { LyreflyCollectionPiece } from '../types';
import {
  addLyreflyPiecesFromDriveFolder,
  comparePieceFileNames,
  createLyreflyCollection,
  deleteLyreflyCollection,
  deleteLyreflyPiece,
  makeLyreflyComicFromPieces,
  updateLyreflyCollection,
} from './lyreflyCollectionMutations';
import { lyreflyDb } from './lyreflyDb';

const mocked = <T extends (...args: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

/** A Drive folder of daily comics, plus a stray non-image and one file someone else owns. */
function stubFolder(): void {
  mocked(driveFetch.driveListFiles).mockImplementation(async (_t: string, q: string) => {
    if (q.includes("name='collections'")) return { files: [] };
    return {
      files: [
        { id: 'f10', name: '10.png', mimeType: 'image/png' },
        { id: 'f2', name: '2.jpg', mimeType: 'image/jpeg' },
        { id: 'f1', name: '1.png', mimeType: 'image/png' },
        { id: 'ds', name: '.DS_Store', mimeType: 'application/octet-stream' },
        { id: 'friend', name: 'Guest strip.png', mimeType: 'image/png' },
      ],
    };
  });
  mocked(planDriveFileImport).mockImplementation(async (_t: string, id: string) =>
    id === 'friend'
      ? { ok: true, plan: { kind: 'copy', sourceFileId: id, name: 'Guest strip.png', mimeType: 'image/png' } }
      : { ok: true, plan: { kind: 'reference', fileId: id, name: id, mimeType: 'image/png' } },
  );
  mocked(executeDriveFileImport).mockImplementation(async (plan: { kind: string; fileId?: string; sourceFileId?: string }) =>
    plan.kind === 'reference'
      ? { fileId: plan.fileId, name: '', via: 'reference' }
      : { fileId: `copy-of-${plan.sourceFileId}`, name: '', via: 'server-copy' },
  );
}

async function pieces(collectionId: string): Promise<LyreflyCollectionPiece[]> {
  const rows = await lyreflyDb.collectionPieces.where('collectionId').equals(collectionId).toArray();
  return rows.filter((p) => !p.deletedAt).sort((a, b) => a.order - b.order);
}

function expectNoWritesToOriginals(): void {
  for (const fn of ['driveTrashFile', 'driveRenameFile', 'driveMoveFile', 'drivePatchJsonMedia', 'drivePatchFileDescription'] as const) {
    expect(driveFetch[fn], fn).not.toHaveBeenCalled();
  }
}

beforeEach(async () => {
  window.localStorage.clear();
  await Promise.all(lyreflyDb.tables.map((t) => t.clear()));
  vi.clearAllMocks();
  stubFolder();
});

describe('adding pieces from a Drive folder', () => {
  it('references your own images in number order, copies one someone else owns, skips non-images', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    const result = await addLyreflyPiecesFromDriveFolder(daily, 'https://drive.google.com/drive/folders/abc123', 'token');

    expect(result).toEqual({ added: 4, alreadyHere: 0, skipped: 1 });
    const rows = await pieces(daily.id);
    expect(rows.map((p) => p.fileName)).toEqual(['1.png', '2.jpg', '10.png', 'Guest strip.png']);
    expect(rows.map((p) => p.driveFileId)).toEqual(['f1', 'f2', 'f10', 'copy-of-friend']);
    // "12.png" says no more than its position; a real name becomes the title.
    expect(rows.map((p) => p.title)).toEqual([undefined, undefined, undefined, 'Guest strip']);
    expect(await lyreflyDb.collections.get(daily.id)).toMatchObject({ sourceUrl: 'https://drive.google.com/drive/folders/abc123' });
    expectNoWritesToOriginals();
  });

  it('adding the same folder again adds nothing, including the copied file', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    await addLyreflyPiecesFromDriveFolder(daily, 'https://drive.google.com/drive/folders/abc123', 'token');
    const again = await addLyreflyPiecesFromDriveFolder((await lyreflyDb.collections.get(daily.id))!, 'https://drive.google.com/drive/folders/abc123', 'token');
    expect(again).toEqual({ added: 0, alreadyHere: 4, skipped: 1 });
    expect(await pieces(daily.id)).toHaveLength(4);
  });

  it('refuses something that is not a folder link', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    await expect(addLyreflyPiecesFromDriveFolder(daily, 'not a link', 'token')).rejects.toThrow(/folder link/);
  });

  it('sorts names with numbers the way a person counts', () => {
    expect(['10.png', '9.png', '100.png', '1.png'].sort(comparePieceFileNames)).toEqual(['1.png', '9.png', '10.png', '100.png']);
  });
});

describe('making a comic from pieces', () => {
  it('copies the picked images in as pages, in the order picked, and remembers where they went', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    await addLyreflyPiecesFromDriveFolder(daily, 'https://drive.google.com/drive/folders/abc123', 'token');
    const [one, two, ten] = await pieces(daily.id);
    mocked(driveFetch.driveGetMediaBlob).mockImplementation(async (_t: string, id: string) => new Blob([id], { type: 'image/png' }));

    const projectId = await makeLyreflyComicFromPieces([ten!, one!, two!], 'Ten, one, two', 'token');

    const project = await lyreflyDb.projects.get(projectId);
    expect(project).toMatchObject({ title: 'Ten, one, two', status: 'wip' });
    expect(project?.layoutOrder).toHaveLength(3);
    const firstRevision = await lyreflyDb.pageRevisions.where('pageNodeId').equals(project!.layoutOrder[0]!).first();
    expect(firstRevision?.fileName).toBe('10.png');
    expect((await lyreflyDb.collectionPieces.get(ten!.id))?.usedInProjectIds).toEqual([projectId]);
    expectNoWritesToOriginals();
  });

  it('a failed download leaves no half-built comic', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    await addLyreflyPiecesFromDriveFolder(daily, 'https://drive.google.com/drive/folders/abc123', 'token');
    const [one, two] = await pieces(daily.id);
    mocked(driveFetch.driveGetMediaBlob)
      .mockResolvedValueOnce(new Blob(['a']))
      .mockRejectedValueOnce(new Error('offline'));
    await expect(makeLyreflyComicFromPieces([one!, two!], 'x', 'token')).rejects.toThrow('offline');
    expect(await lyreflyDb.projects.count()).toBe(0);
  });
});

describe('deleting', () => {
  it('removes Lyrefly’s record of a piece or a collection, never the Drive file', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    await addLyreflyPiecesFromDriveFolder(daily, 'https://drive.google.com/drive/folders/abc123', 'token');
    const [one] = await pieces(daily.id);
    await deleteLyreflyPiece(one!);
    expect(await pieces(daily.id)).toHaveLength(3);
    await deleteLyreflyCollection((await lyreflyDb.collections.get(daily.id))!);
    expect(await pieces(daily.id)).toHaveLength(0);
    expect((await lyreflyDb.collections.get(daily.id))?.deletedAt).toBeDefined();
    expectNoWritesToOriginals();
  });
});

describe('collections across devices', () => {
  async function pushFromThisDevice() {
    const envelope = buildLyreflyDriveEnvelope(await readLyreflyLocalPayload());
    return envelopeToPayload(parseLyreflyDriveEnvelope(serializeLyreflyDriveEnvelope(envelope)));
  }
  async function pullOnThisDevice(drive: Awaited<ReturnType<typeof pushFromThisDevice>>) {
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), drive);
    await writeLyreflyLocalPayload(payload);
  }

  it('a collection and its pieces reach another device', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    await addLyreflyPiecesFromDriveFolder(daily, 'https://drive.google.com/drive/folders/abc123', 'token');
    const drive = await pushFromThisDevice();

    await Promise.all(lyreflyDb.tables.map((t) => t.clear())); // device B
    await pullOnThisDevice(drive);
    expect((await lyreflyDb.collections.get(daily.id))?.title).toBe('Daily comics');
    expect(await pieces(daily.id)).toHaveLength(4);
  });

  it('archiving on one device and renaming later on another keeps the later edit', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    const archived = { ...daily, status: 'archived' as const, updatedAt: '2026-10-02T00:00:00.000Z' };
    const renamedLater = { ...daily, title: 'Daily strips', updatedAt: '2026-10-03T00:00:00.000Z' };
    const merged = mergeLyreflyCollections({ collections: [archived], pieces: [] }, { collections: [renamedLater], pieces: [] });
    expect(merged.collections[0]).toMatchObject({ title: 'Daily strips', status: 'ongoing' });
  });

  it('comics started from a piece on two devices are both remembered', () => {
    const base: LyreflyCollectionPiece = {
      id: 'p', collectionId: 'c', driveFileId: 'f', fileName: '1.png', mimeType: 'image/png', order: 0,
      createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
    };
    const a = { ...base, usedInProjectIds: ['comic-a'], updatedAt: '2026-10-02T00:00:00.000Z' };
    const b = { ...base, usedInProjectIds: ['comic-b'], updatedAt: '2026-10-03T00:00:00.000Z' };
    expect(mergeLyreflyCollections({ collections: [], pieces: [a] }, { collections: [], pieces: [b] }).pieces[0]!.usedInProjectIds?.sort()).toEqual(['comic-a', 'comic-b']);
  });

  it('an edit made while a sync runs survives the write-back', async () => {
    const daily = await createLyreflyCollection('Daily comics');
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), { projects: [] });
    await updateLyreflyCollection((await lyreflyDb.collections.get(daily.id))!, { title: 'Renamed mid-sync' });
    await writeLyreflyLocalPayload(payload);
    expect((await lyreflyDb.collections.get(daily.id))?.title).toBe('Renamed mid-sync');
  });
});
