import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { gestureDb } from '../db/gestureDb';
import {
  buildManifestEntriesFromFiles,
  buildUploadManifestId,
  countManifestProgress,
  fileMatchesManifestEntry,
  fileMatchesManifestEntryLoose,
  reconcileSkippedEmptyManifestEntries,
  selectFilesToUpload,
} from './gestureUploadManifest';

function fileWithPath(path: string, size = 1000, modified = 1_700_000_000_000): File {
  const name = path.split('/').pop() ?? path;
  const body = size > 0 ? 'x'.repeat(size) : '';
  const file = new File([body], name, { type: 'image/jpeg', lastModified: modified });
  Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true });
  return file;
}

describe('gestureUploadManifest', () => {
  it('builds manifest entries from folder files', () => {
    const entries = buildManifestEntriesFromFiles('pack-1', [
      fileWithPath('Hands/a.jpg'),
      fileWithPath('Hands/b.jpg', 2000),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.relativePath).toBe('Hands/a.jpg');
    expect(entries[0]?.status).toBe('pending');
  });

  it('matches files to manifest rows', () => {
    const file = fileWithPath('Hands/a.jpg', 1200, 42);
    const entry = buildManifestEntriesFromFiles('p', [file])[0]!;
    expect(fileMatchesManifestEntry(file, entry)).toBe(true);
    expect(fileMatchesManifestEntry(fileWithPath('Hands/a.jpg', 999, 42), entry)).toBe(false);
    expect(fileMatchesManifestEntryLoose(fileWithPath('Hands/a.jpg', 999, 42), entry)).toBe(true);
  });

  it('selects pending files on resume when size or mtime changed', () => {
    const original = fileWithPath('Folder/b.jpg', 1200, 42);
    const reDownloaded = fileWithPath('Folder/b.jpg', 1300, 99);
    const manifest = buildManifestEntriesFromFiles('p', [original]);
    const { toUpload } = selectFilesToUpload(manifest, [reDownloaded], new Set());
    expect(toUpload.map((f) => f.name)).toEqual(['b.jpg']);
  });

  it('selects only pending manifest files on resume', () => {
    const a = fileWithPath('Folder/a.jpg');
    const b = fileWithPath('Folder/b.jpg');
    const manifest = buildManifestEntriesFromFiles('p', [a, b]);
    manifest[0] = { ...manifest[0]!, status: 'uploaded', driveFileId: 'drive-a' };
    const { toUpload, skipped } = selectFilesToUpload(manifest, [a, b], new Set(['a.jpg']));
    expect(toUpload.map((f) => f.name)).toEqual(['b.jpg']);
    expect(skipped).toBe(1);
  });

  it('falls back to flattened drive names when manifest is missing', () => {
    const a = fileWithPath('Folder/a.jpg');
    const b = fileWithPath('Other/a.jpg');
    const { toUpload } = selectFilesToUpload([], [a, b], new Set(['Folder__a.jpg']));
    expect(toUpload.map((f) => f.name)).toEqual(['a.jpg']);
  });

  it('marks 0-byte images as skipped in the manifest', () => {
    const empty = fileWithPath('Folder/empty.jpg', 0);
    const entries = buildManifestEntriesFromFiles('pack-1', [empty]);
    expect(entries[0]?.status).toBe('skipped');
    expect(entries[0]?.skipReason).toBe('empty');
    expect(countManifestProgress(entries).uploaded).toBe(1);
  });

  it('reconciles pending 0-byte manifest rows before resume', async () => {
    await gestureDb.delete();
    await gestureDb.open();
    await gestureDb.uploadManifestFiles.clear();
    const empty = fileWithPath('Folder/empty.jpg', 0);
    const good = fileWithPath('Folder/good.jpg');
    await gestureDb.uploadManifestFiles.bulkPut([
      {
        id: buildUploadManifestId('pack-1', 'Folder/empty.jpg'),
        packId: 'pack-1',
        relativePath: 'Folder/empty.jpg',
        name: 'empty.jpg',
        size: 0,
        lastModified: empty.lastModified,
        status: 'pending',
      },
      ...buildManifestEntriesFromFiles('pack-1', [good]),
    ]);

    const marked = await reconcileSkippedEmptyManifestEntries('pack-1', [empty, good]);
    expect(marked).toBe(1);

    const rows = await gestureDb.uploadManifestFiles.where('packId').equals('pack-1').toArray();
    expect(rows.find((row) => row.relativePath.endsWith('empty.jpg'))?.status).toBe('skipped');
    expect(rows.find((row) => row.relativePath.endsWith('good.jpg'))?.status).toBe('pending');
    expect(countManifestProgress(rows)).toEqual({ uploaded: 1, total: 2 });
  });
});
