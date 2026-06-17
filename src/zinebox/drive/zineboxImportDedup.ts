import { drivePdfDedupeKey } from '../../shared/drive/driveCollectPdfFilesRecursive';
import type { DrivePdfImportCandidate } from '../../shared/drive/driveCollectPdfFilesRecursive';
import { zineboxDb } from '../db/zineboxDb';
import type { ZineboxComic } from '../types';

export type ZineboxImportDedupIndex = {
  driveRowIds: Set<string>;
  driveMediaIds: Set<string>;
  contentMd5: Set<string>;
  fileSizeAndNameKeys: Set<string>;
};

export function normalizeZineboxImportFilename(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function zineboxFileSizeNameKey(name: string, sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '';
  return `${sizeBytes}:${normalizeZineboxImportFilename(name)}`;
}

export function registerComicOnDedupIndex(index: ZineboxImportDedupIndex, comic: ZineboxComic): void {
  const rowId = comic.driveFileId?.trim();
  const mediaId = comic.driveMediaFileId?.trim();
  const md5 = comic.contentMd5?.trim().toLowerCase();
  const filename = comic.filename?.trim();
  if (rowId) index.driveRowIds.add(rowId);
  if (mediaId) index.driveMediaIds.add(mediaId);
  if (md5) index.contentMd5.add(md5);
  if (filename && comic.fileSizeBytes && comic.fileSizeBytes > 0) {
    const key = zineboxFileSizeNameKey(filename, comic.fileSizeBytes);
    if (key) index.fileSizeAndNameKeys.add(key);
  }
}

export function registerDriveCandidateOnDedupIndex(
  index: ZineboxImportDedupIndex,
  file: DrivePdfImportCandidate,
  mediaFileId?: string,
  contentMd5?: string,
): void {
  const rowId = file.id?.trim();
  const dedupeKey = drivePdfDedupeKey(file);
  const md5 = contentMd5?.trim().toLowerCase() || file.md5Checksum?.trim().toLowerCase();
  const name = file.name?.trim();
  const sizeBytes = parseDriveSizeBytes(file.size);
  if (rowId) index.driveRowIds.add(rowId);
  if (mediaFileId?.trim()) index.driveMediaIds.add(mediaFileId.trim());
  if (dedupeKey) index.driveMediaIds.add(dedupeKey);
  if (md5) index.contentMd5.add(md5);
  if (name && sizeBytes > 0) {
    const key = zineboxFileSizeNameKey(name, sizeBytes);
    if (key) index.fileSizeAndNameKeys.add(key);
  }
}

export function registerLocalFileOnDedupIndex(index: ZineboxImportDedupIndex, file: File): void {
  const key = zineboxFileSizeNameKey(file.name, file.size);
  if (key) index.fileSizeAndNameKeys.add(key);
}

export async function loadZineboxImportDedupIndex(): Promise<ZineboxImportDedupIndex> {
  const comics = await zineboxDb.comics.toArray();
  const index: ZineboxImportDedupIndex = {
    driveRowIds: new Set<string>(),
    driveMediaIds: new Set<string>(),
    contentMd5: new Set<string>(),
    fileSizeAndNameKeys: new Set<string>(),
  };
  for (const comic of comics) {
    registerComicOnDedupIndex(index, comic);
  }
  return index;
}

function parseDriveSizeBytes(size: string | undefined): number {
  const parsed = Number.parseInt(size?.trim() ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function isDrivePdfAlreadyImported(
  file: DrivePdfImportCandidate,
  index: ZineboxImportDedupIndex,
): boolean {
  const rowId = file.id?.trim();
  const dedupeKey = drivePdfDedupeKey(file);
  if (rowId && index.driveRowIds.has(rowId)) return true;
  if (dedupeKey && index.driveMediaIds.has(dedupeKey)) return true;

  const md5 = file.md5Checksum?.trim().toLowerCase();
  if (md5 && index.contentMd5.has(md5)) return true;

  const name = file.name?.trim();
  const sizeBytes = parseDriveSizeBytes(file.size);
  if (name && sizeBytes > 0) {
    const key = zineboxFileSizeNameKey(name, sizeBytes);
    if (key && index.fileSizeAndNameKeys.has(key)) return true;
  }

  return false;
}

export function isLocalPdfAlreadyImported(file: File, index: ZineboxImportDedupIndex): boolean {
  const key = zineboxFileSizeNameKey(file.name, file.size);
  return Boolean(key && index.fileSizeAndNameKeys.has(key));
}

export function dedupeLocalPdfFiles(
  files: readonly File[],
  index: ZineboxImportDedupIndex,
): { toImport: File[]; skippedLibrary: number; skippedBatch: number } {
  const toImport: File[] = [];
  const batchSeen = new Set<string>();
  let skippedLibrary = 0;
  let skippedBatch = 0;

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.pdf')) continue;
    if (isLocalPdfAlreadyImported(file, index)) {
      skippedLibrary += 1;
      continue;
    }
    const batchKey = zineboxFileSizeNameKey(file.name, file.size);
    if (batchKey && batchSeen.has(batchKey)) {
      skippedBatch += 1;
      continue;
    }
    if (batchKey) batchSeen.add(batchKey);
    toImport.push(file);
  }

  return { toImport, skippedLibrary, skippedBatch };
}
