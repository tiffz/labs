// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveListFiles: vi.fn(),
  driveCreateFolder: vi.fn(),
  driveCreateJsonFile: vi.fn(),
  drivePatchJsonMedia: vi.fn(),
  driveUploadFileResumable: vi.fn(),
  driveGetFileMetadata: vi.fn(),
  driveGetMedia: vi.fn(),
  driveGetMediaArrayBuffer: vi.fn(),
}));

import { driveGetMediaArrayBuffer, driveUploadFileResumable } from '../../shared/drive/driveFetch';
import { lyreflyDb } from '../db/lyreflyDb';
import {
  addSketchbookAttachment,
  deleteSketchbookSeed,
  putSketchbookSeed,
  removeSketchbookAttachment,
  updateSketchbookSeed,
} from '../db/sketchbookMutations';
import type { SketchbookSeed } from '../types';
import { buildLyreflyDriveEnvelope, envelopeToPayload, parseLyreflyDriveEnvelope, serializeLyreflyDriveEnvelope } from './lyreflyDriveEnvelope';
import type { LyreflySyncPayload } from './lyreflyDriveEnvelope';
import { mergeLyreflySyncPayload } from './lyreflyDriveMerge';
import { readLyreflyLocalPayload, writeLyreflyLocalPayload } from './lyreflyLocalData';
import {
  downloadMissingLyreflySketchbookBlobs,
  mergeLyreflySketchbook,
  uploadLyreflySketchbookBlobs,
} from './lyreflySketchbookSync';

const T0 = '2026-10-01T00:00:00.000Z';
const T1 = '2026-10-02T00:00:00.000Z';
const T2 = '2026-10-03T00:00:00.000Z';

function seed(overrides: Partial<SketchbookSeed> = {}): SketchbookSeed {
  return {
    id: 's1',
    kind: 'idea',
    title: 'Memory Palace',
    bodyHtml: '<p>A difficult deal.</p>',
    tags: [],
    status: 'active',
    sortOrder: 0,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  };
}

/** What Drive holds after a device pushes: its local payload through the real envelope. */
async function pushFromThisDevice(): Promise<LyreflySyncPayload> {
  const envelope = buildLyreflyDriveEnvelope(await readLyreflyLocalPayload());
  return envelopeToPayload(parseLyreflyDriveEnvelope(serializeLyreflyDriveEnvelope(envelope)));
}

/** What a pull does on this device: merge Drive with local, write the result. */
async function pullOnThisDevice(drive: LyreflySyncPayload): Promise<void> {
  const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), drive);
  await writeLyreflyLocalPayload(payload);
}

async function wipeDevice(): Promise<void> {
  await Promise.all(lyreflyDb.tables.map((t) => t.clear()));
}

beforeEach(async () => {
  window.localStorage.clear();
  await wipeDevice();
  vi.clearAllMocks();
});

describe('sketchbook across devices', () => {
  it('an idea typed on one device reaches another', async () => {
    await putSketchbookSeed(seed());
    const drive = await pushFromThisDevice();

    await wipeDevice(); // device B
    await pullOnThisDevice(drive);
    expect((await lyreflyDb.sketchbookSeeds.get('s1'))?.title).toBe('Memory Palace');
  });

  it('a delete on one device removes the idea on another that still has the older copy', async () => {
    await putSketchbookSeed(seed());
    const older = await pushFromThisDevice();
    await deleteSketchbookSeed((await lyreflyDb.sketchbookSeeds.get('s1'))!);
    const afterDelete = await pushFromThisDevice();

    await wipeDevice(); // device B, which only ever saw the idea before the delete
    await pullOnThisDevice(older);
    await pullOnThisDevice(afterDelete);
    const row = await lyreflyDb.sketchbookSeeds.get('s1');
    expect(row?.deletedAt).toBeDefined();
    expect(row?.status).toBe('archived');
    expect(row?.bodyHtml).toBeUndefined();
  });

  it('an edit made after a delete on another device wins and brings the idea back', () => {
    const deleted = { ...seed({ updatedAt: T1 }), deletedAt: T1, status: 'archived' as const };
    const editedLater = seed({ title: 'Memory Palace, revised', updatedAt: T2 });
    const [merged] = mergeLyreflySketchbook([deleted], [editedLater]);
    expect(merged).toMatchObject({ title: 'Memory Palace, revised', status: 'active' });
    expect(merged!.deletedAt).toBeUndefined();
  });

  it('a newer delete is not refilled by the other side’s attachments', () => {
    const withAttachment = seed({ attachments: [{ id: 'a1', kind: 'link', url: 'https://x', createdAt: T0 }] });
    const deleted = { ...seed({ updatedAt: T1 }), deletedAt: T1, status: 'archived' as const };
    const [merged] = mergeLyreflySketchbook([withAttachment], [deleted]);
    expect(merged!.attachments).toBeUndefined();
    expect(merged!.deletedAt).toBe(T1);
  });

  it('attachments added on each device both survive, and a removed one stays removed', () => {
    const base = seed({ attachments: [{ id: 'old', kind: 'link', url: 'https://old', createdAt: T0 }] });
    const deviceA = {
      ...base,
      updatedAt: T1,
      attachments: [{ id: 'fromA', kind: 'link' as const, url: 'https://a', createdAt: T1 }],
      removedAttachmentIds: ['old'],
    };
    const deviceB = {
      ...base,
      updatedAt: T2,
      attachments: [...base.attachments!, { id: 'fromB', kind: 'link' as const, url: 'https://b', createdAt: T2 }],
    };
    const [merged] = mergeLyreflySketchbook([deviceA], [deviceB]);
    expect(merged!.attachments!.map((a) => a.id).sort()).toEqual(['fromA', 'fromB']);
  });

  it('removing an attachment records it so an older copy cannot bring it back', async () => {
    await putSketchbookSeed(seed());
    const withLink = await addSketchbookAttachment(
      (await lyreflyDb.sketchbookSeeds.get('s1'))!,
      { id: 'a1', kind: 'link', url: 'https://ref', createdAt: T0 },
    );
    const removed = await removeSketchbookAttachment(withLink, 'a1');
    expect(removed.removedAttachmentIds).toEqual(['a1']);
    const [merged] = mergeLyreflySketchbook([removed], [{ ...withLink, updatedAt: T0 }]);
    expect(merged!.attachments ?? []).toEqual([]);
  });

  it('an edit made while a sync runs survives that sync writing back', async () => {
    await putSketchbookSeed(seed());
    const { payload } = mergeLyreflySyncPayload(await readLyreflyLocalPayload(), { projects: [] });
    const current = (await lyreflyDb.sketchbookSeeds.get('s1'))!;
    await updateSketchbookSeed({ ...current, title: 'Typed mid-sync' });
    await writeLyreflyLocalPayload(payload);
    expect((await lyreflyDb.sketchbookSeeds.get('s1'))?.title).toBe('Typed mid-sync');
  });
});

describe('sketchbook images', () => {
  it('upload records the Drive id; another device downloads the image from it', async () => {
    const image = new File([new Uint8Array([1, 2, 3])], 'sketch.png', { type: 'image/png' });
    await putSketchbookSeed(seed({ kind: 'image', fileName: 'sketch.png', mimeType: 'image/png' }), image);
    (driveUploadFileResumable as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'drive-file-1' });

    await uploadLyreflySketchbookBlobs('token', async () => 'sketchbook-folder', vi.fn());
    expect((await lyreflyDb.sketchbookSeeds.get('s1'))?.blobDriveFileIds).toEqual({ s1: 'drive-file-1' });

    const drive = await pushFromThisDevice();
    await wipeDevice(); // device B
    await pullOnThisDevice(drive);
    (driveGetMediaArrayBuffer as ReturnType<typeof vi.fn>).mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    // fake-indexeddb does not round-trip a Blob's bytes, so check what was written, not what reads back.
    const put = vi.spyOn(lyreflyDb.sketchbookBlobs, 'put');
    await downloadMissingLyreflySketchbookBlobs('token', vi.fn());

    expect(driveGetMediaArrayBuffer).toHaveBeenCalledWith('token', 'drive-file-1');
    const written = put.mock.calls[0]?.[0] as { seedId: string; blob: Blob };
    expect(written.seedId).toBe('s1');
    expect(written.blob.size).toBe(3);
    expect(written.blob.type).toBe('image/png');
  });

  it('does not upload an image twice', async () => {
    const image = new File([new Uint8Array([1])], 'sketch.png', { type: 'image/png' });
    await putSketchbookSeed(seed({ kind: 'image' }), image);
    (driveUploadFileResumable as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'drive-file-1' });
    await uploadLyreflySketchbookBlobs('token', async () => 'f', vi.fn());
    await uploadLyreflySketchbookBlobs('token', async () => 'f', vi.fn());
    expect(driveUploadFileResumable).toHaveBeenCalledTimes(1);
  });

  it('a file deleted on Drive is skipped and named, and the ideas after it still download', async () => {
    await lyreflyDb.sketchbookSeeds.bulkPut([
      seed({ id: 'gone', title: 'Gone sketch', kind: 'image', blobDriveFileIds: { gone: 'drive-gone' } }),
      seed({ id: 'kept', title: 'Kept sketch', kind: 'image', mimeType: 'image/png', blobDriveFileIds: { kept: 'drive-kept' } }),
    ]);
    (driveGetMediaArrayBuffer as ReturnType<typeof vi.fn>).mockImplementation(async (_t: string, id: string) => {
      if (id === 'drive-gone') throw Object.assign(new Error('File not found'), { status: 404 });
      return new Uint8Array([1]).buffer;
    });
    const put = vi.spyOn(lyreflyDb.sketchbookBlobs, 'put');
    const labels: string[] = [];
    await downloadMissingLyreflySketchbookBlobs('token', (l) => labels.push(l));

    expect(put.mock.calls.map((c) => (c[0] as { seedId: string }).seedId)).toEqual(['kept']);
    expect(labels.at(-1)).toMatch(/1 file could not be downloaded from Drive \(Gone sketch\)/);
  });

  it('an unknown failure stops the sync and stores nothing, so the next sync retries', async () => {
    await lyreflyDb.sketchbookSeeds.put(seed({ kind: 'image', blobDriveFileIds: { s1: 'drive-file-1' } }));
    (driveGetMediaArrayBuffer as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    await expect(downloadMissingLyreflySketchbookBlobs('token', vi.fn())).rejects.toThrow('offline');
    expect(await lyreflyDb.sketchbookBlobs.get('s1')).toBeUndefined();
  });
});
