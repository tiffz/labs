import { describe, expect, it } from 'vitest';

import {
  dedupeLocalPdfFiles,
  isDrivePdfAlreadyImported,
  normalizeZineboxImportFilename,
  registerComicOnDedupIndex,
  zineboxFileSizeNameKey,
} from './zineboxImportDedup';
import type { ZineboxImportDedupIndex } from './zineboxImportDedup';

function emptyIndex(): ZineboxImportDedupIndex {
  return {
    driveRowIds: new Set<string>(),
    driveMediaIds: new Set<string>(),
    contentMd5: new Set<string>(),
    fileSizeAndNameKeys: new Set<string>(),
  };
}

function pdfNamed(name: string, sizeBytes: number): File {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('zineboxImportDedup', () => {
  it('normalizes filenames for stable keys', () => {
    expect(normalizeZineboxImportFilename('  Issue  One.PDF ')).toBe('issue one.pdf');
  });

  it('detects drive duplicates by id, md5, and size+name', () => {
    const index = emptyIndex();
    index.driveRowIds.add('row-1');
    index.contentMd5.add('abc123');
    index.fileSizeAndNameKeys.add(zineboxFileSizeNameKey('zine.pdf', 1024));

    expect(isDrivePdfAlreadyImported({ id: 'row-1', name: 'zine.pdf' }, index)).toBe(true);
    expect(
      isDrivePdfAlreadyImported({ id: 'row-2', name: 'other.pdf', md5Checksum: 'abc123' }, index),
    ).toBe(true);
    expect(
      isDrivePdfAlreadyImported({ id: 'row-3', name: 'zine.pdf', size: '1024' }, index),
    ).toBe(true);
    expect(
      isDrivePdfAlreadyImported({ id: 'row-4', name: 'new.pdf', size: '2048' }, index),
    ).toBe(false);
  });

  it('dedupes local files against library and within the batch', () => {
    const index = emptyIndex();
    registerComicOnDedupIndex(index, {
      id: 'comic-1',
      title: 'Existing',
      source: 'Local',
      fileId: 'comic-1',
      filename: 'existing.pdf',
      fileSizeBytes: 500,
      coverThumbnailBase64: '',
      readStatus: 'unread',
      progressPercentage: 0,
    });

    const existing = pdfNamed('existing.pdf', 500);
    const duplicateInBatchA = pdfNamed('batch.pdf', 900);
    const duplicateInBatchB = pdfNamed('batch.pdf', 900);
    const fresh = pdfNamed('fresh.pdf', 1200);

    const result = dedupeLocalPdfFiles([existing, duplicateInBatchA, duplicateInBatchB, fresh], index);
    expect(result.skippedLibrary).toBe(1);
    expect(result.skippedBatch).toBe(1);
    expect(result.toImport.map((f) => f.name)).toEqual(['batch.pdf', 'fresh.pdf']);
  });

  it('registerComicOnDedupIndex captures drive and content fingerprints', () => {
    const index = emptyIndex();
    registerComicOnDedupIndex(index, {
      id: 'comic-md5',
      title: 'Md5 zine',
      source: 'Drive',
      fileId: 'comic-md5',
      filename: 'md5.pdf',
      fileSizeBytes: 2048,
      contentMd5: 'deadbeef',
      coverThumbnailBase64: '',
      readStatus: 'unread',
      progressPercentage: 0,
      driveFileId: 'drive-row',
      driveMediaFileId: 'drive-media',
    });

    expect(index.driveRowIds.has('drive-row')).toBe(true);
    expect(index.driveMediaIds.has('drive-media')).toBe(true);
    expect(index.contentMd5.has('deadbeef')).toBe(true);
    expect(index.fileSizeAndNameKeys.has(zineboxFileSizeNameKey('md5.pdf', 2048))).toBe(true);
  });
});
