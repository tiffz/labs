// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveListFiles: vi.fn(),
  driveCreateFolder: vi.fn(),
  driveUploadFileResumable: vi.fn(),
  driveGetMediaBlob: vi.fn(async () => new Blob([new Uint8Array(2048)], { type: 'image/jpeg' })),
  driveResolveThumbnailLink: vi.fn(async () => 'https://lh3.googleusercontent.com/drive-storage/abc=s220'),
}));
// jsdom cannot decode images; the shrink is the shared helper's job, tested where it lives.
vi.mock('../../shared/zine/platformResize', async (load) => ({
  ...(await load<typeof import('../../shared/zine/platformResize')>()),
  resizeImageBlobForPlatform: vi.fn(async () => new Blob([new Uint8Array(64)], { type: 'image/jpeg' })),
}));

import * as driveFetch from '../../shared/drive/driveFetch';
import * as platformResize from '../../shared/zine/platformResize';
import type { LyreflyCollectionPiece } from '../types';
import { loadLyreflyPieceThumb } from './lyreflyCollectionMutations';
import { lyreflyDb } from './lyreflyDb';

const piece = { id: 'p1', driveFileId: 'drive-1', fileName: '1.png', mimeType: 'image/png' } as LyreflyCollectionPiece;

beforeEach(async () => {
  await lyreflyDb.delete();
  await lyreflyDb.open();
  vi.clearAllMocks();
});

describe('piece thumbnails', () => {
  it('never fetches the thumbnailLink, whose host refuses CORS, and shrinks the original instead', async () => {
    // In a browser this fetch throws: lh3.googleusercontent.com answers the preflight with a 400.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const thumb = await loadLyreflyPieceThumb(piece, 'token');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(driveFetch.driveGetMediaBlob).toHaveBeenCalledWith('token', 'drive-1');
    expect(vi.mocked(platformResize.resizeImageBlobForPlatform).mock.calls[0]![1].maxWidthPx).toBe(480);
    expect(thumb?.size).toBe(64);
    fetchSpy.mockRestore();
  });

  // The per-device cache is not tested here: fake-indexeddb stores a jsdom Blob as a plain object.
});
