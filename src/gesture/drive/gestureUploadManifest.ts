import type { GestureUploadManifestFile } from '../types';
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

export function buildManifestEntriesFromFiles(
  packId: string,
  files: File[],
): GestureUploadManifestFile[] {
  return files.map((file) => ({
    id: buildUploadManifestId(packId, localFileRelativePath(file)),
    packId,
    relativePath: localFileRelativePath(file),
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    status: 'pending' as const,
  }));
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
    if (entry.status === 'uploaded') {
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

export function countManifestProgress(manifest: GestureUploadManifestFile[]): {
  uploaded: number;
  total: number;
} {
  const total = manifest.length;
  const uploaded = manifest.filter((e) => e.status === 'uploaded').length;
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
    await gestureDb.uploadManifestFiles.put({ ...row, status: 'uploaded', driveFileId });
  }
}
