// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveListFiles: vi.fn(async () => ({ files: [] })),
  driveCreateFolder: vi.fn(async (_token: string, name: string) => ({ id: `folder:${name}` })),
  driveUploadFileResumable: vi.fn(),
  driveCreateJsonFile: vi.fn(),
  driveGetMediaBlob: vi.fn(),
  driveResolveThumbnailLink: vi.fn(),
}));
vi.mock('../../shared/drive/labsDrivePortfolioLayout', () => ({
  LABS_DRIVE_APP_FOLDER_LYREFLY: 'Lyrefly',
  ensureLabsDrivePortfolioProgressLayout: vi.fn(async () => ({ rootFolderId: 'r', appFolderId: 'app', progressFileId: 'p' })),
}));

import * as driveFetch from '../../shared/drive/driveFetch';
import { deleteLyreflyCollection, deleteLyreflyPiece } from '../db/lyreflyCollectionMutations';
import { lyreflyDb } from '../db/lyreflyDb';
import {
  applyLyreflyBundleImport,
  bundlePiecesToUpload,
  LyreflyBundleError,
  parseLyreflyBundle,
  planLyreflyBundleImport,
  type LyreflyBundleV1,
} from './lyreflyBundleImport';

const upload = vi.mocked(driveFetch.driveUploadFileResumable);

// A made-up archive: the owner's old comics are personal and never live in this repo.
function bundle(): LyreflyBundleV1 {
  return {
    format: 'lyrefly-bundle',
    version: 1,
    source: 'Old site',
    comics: [],
    seeds: [],
    collections: [
      {
        key: 'old-site',
        title: 'Old Site',
        status: 'archived',
        sourceUrl: 'https://example.com/',
        pieces: [
          { key: '1', file: 'old-01.jpg', title: 'Sheep', notes: 'Counting them.', sourceUrl: 'https://example.com/1' },
          { key: '2', file: 'old-02.jpg', title: 'Deer' },
          { key: '3', file: 'old-03.jpg', title: 'Falling' },
        ],
      },
    ],
  };
}

const image = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
const allFiles = () => ['old-01.jpg', 'old-02.jpg', 'old-03.jpg'].map(image);
const token = async () => 'token';

async function plan(files = allFiles(), b = bundle()) {
  return planLyreflyBundleImport(parseLyreflyBundle(b), files);
}

beforeEach(async () => {
  await lyreflyDb.delete();
  await lyreflyDb.open();
  vi.clearAllMocks();
  upload.mockImplementation(async (_t, file) => ({ id: `drive:${file.name}` }));
});

describe('bundle collections', () => {
  it('creates the collection as given and uploads each image into its own folder, in order', async () => {
    const result = await applyLyreflyBundleImport(await plan(), { getAccessToken: token });

    expect(result).toMatchObject({ collectionsCreated: 1, piecesAdded: 3 });
    const [collection] = await lyreflyDb.collections.toArray();
    expect(collection).toMatchObject({ title: 'Old Site', status: 'archived', sourceUrl: 'https://example.com/' });
    const pieces = (await lyreflyDb.collectionPieces.toArray()).sort((a, b) => a.order - b.order);
    expect(pieces.map((p) => [p.title, p.driveFileId])).toEqual([
      ['Sheep', 'drive:old-01.jpg'],
      ['Deer', 'drive:old-02.jpg'],
      ['Falling', 'drive:old-03.jpg'],
    ]);
    expect(pieces[0]).toMatchObject({ notes: 'Counting them.', sourceUrl: 'https://example.com/1', collectionId: collection!.id });
    // Lyrefly/collections/Old Site/
    expect(upload.mock.calls.every(([, , parents]) => parents[0] === 'folder:Old Site')).toBe(true);
  });

  it('running it again uploads nothing', async () => {
    await applyLyreflyBundleImport(await plan(), { getAccessToken: token });
    upload.mockClear();
    const again = await plan();
    expect(bundlePiecesToUpload(again)).toBe(0);
    expect(await applyLyreflyBundleImport(again, { getAccessToken: token })).toMatchObject({ collectionsCreated: 0, piecesAdded: 0 });
    expect(upload).not.toHaveBeenCalled();
    expect(await lyreflyDb.collectionPieces.count()).toBe(3);
  });

  it('leaves out images not picked with the file, and adds them when they are', async () => {
    const partial = await plan([image('old-01.jpg')]);
    expect(partial.collections[0]!.pieces.map((p) => p.action)).toEqual(['create', 'missing', 'missing']);
    await applyLyreflyBundleImport(partial, { getAccessToken: token });
    expect(await lyreflyDb.collectionPieces.count()).toBe(1);

    await applyLyreflyBundleImport(await plan(), { getAccessToken: token });
    expect(upload).toHaveBeenCalledTimes(3);
    expect(await lyreflyDb.collectionPieces.count()).toBe(3);
  });

  it('a stopped import keeps what landed, and a re-run uploads only the rest', async () => {
    upload.mockImplementation(async (_t, file) => {
      if (file.name === 'old-02.jpg') throw new Error('Network down.');
      return { id: `drive:${file.name}` };
    });
    await expect(applyLyreflyBundleImport(await plan(), { getAccessToken: token })).rejects.toThrow('Network down.');
    expect((await lyreflyDb.collectionPieces.toArray()).map((p) => p.fileName)).toEqual(['old-01.jpg']);

    upload.mockClear();
    upload.mockImplementation(async (_t, file) => ({ id: `drive:${file.name}` }));
    await applyLyreflyBundleImport(await plan(), { getAccessToken: token });
    expect(upload.mock.calls.map(([, file]) => file.name)).toEqual(['old-02.jpg', 'old-03.jpg']);
  });

  it('a collection you deleted stays deleted, and nothing is uploaded for it', async () => {
    await applyLyreflyBundleImport(await plan(), { getAccessToken: token });
    await deleteLyreflyCollection((await lyreflyDb.collections.toArray())[0]!);
    upload.mockClear();

    const again = await plan();
    expect(again.collections[0]!.action).toBe('deleted');
    expect(bundlePiecesToUpload(again)).toBe(0);
    await applyLyreflyBundleImport(again, { getAccessToken: token });
    expect(upload).not.toHaveBeenCalled();
    expect((await lyreflyDb.collections.toArray()).every((c) => c.deletedAt)).toBe(true);
    expect((await lyreflyDb.collectionPieces.toArray()).every((p) => p.deletedAt)).toBe(true);
  });

  it('a piece you removed stays removed', async () => {
    await applyLyreflyBundleImport(await plan(), { getAccessToken: token });
    const deer = (await lyreflyDb.collectionPieces.toArray()).find((p) => p.title === 'Deer')!;
    await deleteLyreflyPiece(deer);
    upload.mockClear();

    await applyLyreflyBundleImport(await plan(), { getAccessToken: token });
    expect(upload).not.toHaveBeenCalled();
    expect((await lyreflyDb.collectionPieces.get(deer.id))?.deletedAt).toBeTruthy();
  });

  it('will not upload without Drive access', async () => {
    await expect(applyLyreflyBundleImport(await plan())).rejects.toThrow(LyreflyBundleError);
    expect(upload).not.toHaveBeenCalled();
  });

  it('a bundle without collections still reads (older bundles)', async () => {
    const older = bundle();
    delete older.collections;
    expect((await plan([], older)).collections).toEqual([]);
  });

  it.each([
    ['an unknown status', (b: LyreflyBundleV1) => void (b.collections![0]!.status = 'done' as never), /unknown status/],
    ['a repeated piece key', (b: LyreflyBundleV1) => void (b.collections![0]!.pieces[1]!.key = '1'), /used twice/],
    ['a piece with no file', (b: LyreflyBundleV1) => void (b.collections![0]!.pieces[0]!.file = ''), /names no file/],
    ['a bad date', (b: LyreflyBundleV1) => void (b.collections![0]!.pieces[0]!.occurredOn = 'May 2014'), /YYYY-MM-DD/],
  ])('refuses %s', (_name, breakIt, message) => {
    const b = bundle();
    breakIt(b);
    expect(() => parseLyreflyBundle(b)).toThrow(message);
  });
});
