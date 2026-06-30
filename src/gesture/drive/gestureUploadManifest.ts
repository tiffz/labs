import type { GestureUploadManifestFile, GestureUploadManifestSkipReason } from '../types';
import { gestureDb } from '../db/gestureDb';
import { filterGestureUploadImageFiles } from './gesturePackMetadata';
import { gestureDriveUploadFileName } from './gestureDriveUploadFileName';

type FileWithRelativePath = File & { webkitRelativePath?: string };

export function localFileRelativePath(file: File): string {
  const rel = (file as FileWithRelativePath).webkitRelativePath?.trim();
  return rel || file.name;
}

export function buildUploadManifestId(packId: string, relativePath: string): string {
  return `${packId}::${relativePath}`;
}

export function fileMatchesManifestEntry(file: File, entry: GestureUploadManifestFile): boolean {
  return (
    entry.relativePath === localFileRelativePath(file) &&
    entry.name === file.name &&
    entry.size === file.size &&
    entry.lastModified === file.lastModified
  );
}

/** Resume upload when the folder was re-downloaded (size / mtime may differ). */
export function fileMatchesManifestEntryLoose(file: File, entry: GestureUploadManifestFile): boolean {
  return entry.relativePath === localFileRelativePath(file) && entry.name === file.name;
}

function manifestStatusForFile(file: File): GestureUploadManifestFile['status'] {
  return file.size <= 0 ? 'skipped' : 'pending';
}

function manifestEntryForFile(packId: string, file: File): GestureUploadManifestFile {
  const status = manifestStatusForFile(file);
  return {
    id: buildUploadManifestId(packId, localFileRelativePath(file)),
    packId,
    relativePath: localFileRelativePath(file),
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    status,
    ...(status === 'skipped' ? { skipReason: 'empty' as const } : {}),
  };
}

export function buildManifestEntriesFromFiles(
  packId: string,
  files: File[],
): GestureUploadManifestFile[] {
  return files.map((file) => manifestEntryForFile(packId, file));
}

/** Pick local files that still need uploading for this pack. */
export function selectFilesToUpload(
  manifest: GestureUploadManifestFile[],
  picked: File[],
  alreadyUploadedNames: Set<string>,
): { toUpload: File[]; skipped: number; unmatched: number } {
  if (manifest.length === 0) {
    const images = filterGestureUploadImageFiles(picked);
    const toUpload = images.filter((f) => !alreadyUploadedNames.has(gestureDriveUploadFileName(f)));
    return {
      toUpload,
      skipped: images.length - toUpload.length,
      unmatched: picked.length - images.length,
    };
  }

  const pending = manifest.filter((e) => e.status === 'pending');
  const toUpload: File[] = [];
  let skipped = 0;
  for (const entry of manifest) {
    if (entry.status === 'uploaded' || entry.status === 'skipped') {
      skipped += 1;
    }
  }
  for (const file of picked) {
    const match = pending.find(
      (entry) =>
        fileMatchesManifestEntry(file, entry) || fileMatchesManifestEntryLoose(file, entry),
    );
    if (match) {
      toUpload.push(file);
    }
  }
  const unmatched = picked.length - toUpload.length - skipped;
  return { toUpload, skipped, unmatched };
}

export function isManifestEntryComplete(entry: GestureUploadManifestFile): boolean {
  return entry.status === 'uploaded' || entry.status === 'skipped';
}

export function countManifestProgress(manifest: GestureUploadManifestFile[]): {
  uploaded: number;
  total: number;
} {
  const total = manifest.length;
  const uploaded = manifest.filter((e) => isManifestEntryComplete(e)).length;
  return { uploaded, total };
}

export async function markManifestFileUploaded(
  packId: string,
  file: File,
  driveFileId: string,
): Promise<void> {
  const id = buildUploadManifestId(packId, localFileRelativePath(file));
  const row = await gestureDb.uploadManifestFiles.get(id);
  if (row) {
    await gestureDb.uploadManifestFiles.put({ ...row, status: 'uploaded', driveFileId, skipReason: undefined });
  }
}

export async function markManifestFileSkipped(
  packId: string,
  file: File,
  skipReason: GestureUploadManifestSkipReason,
): Promise<void> {
  const id = buildUploadManifestId(packId, localFileRelativePath(file));
  const row = await gestureDb.uploadManifestFiles.get(id);
  if (row && row.status === 'pending') {
    await gestureDb.uploadManifestFiles.put({ ...row, status: 'skipped', skipReason, driveFileId: undefined });
  }
}

export async function markManifestEntrySkipped(
  entry: GestureUploadManifestFile,
  skipReason: GestureUploadManifestSkipReason,
): Promise<void> {
  if (entry.status !== 'pending') return;
  await gestureDb.uploadManifestFiles.put({
    ...entry,
    status: 'skipped',
    skipReason,
    driveFileId: undefined,
  });
}

/** Mark 0-byte manifest rows (and matching picked files) as skipped so resume can continue. */
export async function reconcileSkippedEmptyManifestEntries(
  packId: string,
  files: File[],
): Promise<number> {
  const manifest = await gestureDb.uploadManifestFiles.where('packId').equals(packId).toArray();
  const fileByPath = new Map(files.map((file) => [localFileRelativePath(file), file]));
  let marked = 0;

  for (const entry of manifest) {
    if (entry.status !== 'pending') continue;
    const picked = fileByPath.get(entry.relativePath);
    if (entry.size <= 0 || picked?.size === 0) {
      await markManifestEntrySkipped(entry, 'empty');
      if (picked) {
        await gestureDb.uploadStagingBlobs.delete(
          buildUploadManifestId(packId, localFileRelativePath(picked)),
        );
      }
      marked += 1;
    }
  }

  return marked;
}
