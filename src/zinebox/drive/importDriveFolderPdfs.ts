import { DriveHttpError, driveGetMediaArrayBuffer, driveResolveFileForMedia } from '../../shared/drive/driveFetch';
import { formatZineboxDriveImportError } from './zineboxDriveImportErrors';
import { drivePdfDedupeKey, type DrivePdfImportCandidate } from '../../shared/drive/driveCollectPdfFilesRecursive';
import { zineboxDb } from '../db/zineboxDb';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import type { ZineboxComic } from '../types';
import {
  extractPdfCoverThumbnail,
  titleFromPdfFilename,
} from './importLocalPdfs';
import type { ZineboxImportBatchMetadata } from './zineboxImportMetadata';
import {
  isDrivePdfAlreadyImported,
  loadZineboxImportDedupIndex,
  registerDriveCandidateOnDedupIndex,
} from './zineboxImportDedup';
import { normalizeZineboxTags } from '../utils/zineboxTags';

export type ImportDriveFolderResult = {
  imported: number;
  skipped: number;
  folderName: string;
};

function sourceFromPathHint(parentPathHint: string | undefined, folderName: string): string {
  const hint = parentPathHint?.trim();
  if (!hint) return folderName;
  const first = hint.split('/').map((s) => s.trim()).find(Boolean);
  return first || folderName;
}

function resolveComicSource(
  file: DrivePdfImportCandidate,
  folderName: string,
  metadata: ZineboxImportBatchMetadata,
): string {
  if (metadata.useSubfolderAsSource) {
    return sourceFromPathHint(file.parentPathHint, folderName);
  }
  const batch = metadata.source.trim();
  return batch || folderName;
}

function parseDriveSizeBytes(size: string | undefined): number | undefined {
  const parsed = Number.parseInt(size?.trim() ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function importScannedDriveFolderPdfs(
  accessToken: string,
  scan: {
    folderName: string;
    files: DrivePdfImportCandidate[];
  },
  metadata: ZineboxImportBatchMetadata,
  onProgress?: (message: string) => void,
): Promise<ImportDriveFolderResult> {
  const dedupIndex = await loadZineboxImportDedupIndex();
  const tags = normalizeZineboxTags(metadata.tags);
  let imported = 0;

  const pendingFiles = scan.files.filter((file) => !isDrivePdfAlreadyImported(file, dedupIndex));
  let skipped = scan.files.length - pendingFiles.length;

  for (const [fileIndex, file] of pendingFiles.entries()) {
    const driveFileId = file.id?.trim();
    const name = file.name?.trim() || 'zine.pdf';
    if (!driveFileId) continue;

    onProgress?.(`Importing ${fileIndex + 1} of ${pendingFiles.length}… ${name}`);
    let mediaFileId: string;
    let meta: Awaited<ReturnType<typeof driveResolveFileForMedia>>['meta'];
    try {
      ({ mediaFileId, meta } = await driveResolveFileForMedia(accessToken, driveFileId));
    } catch (e) {
      throw new Error(formatZineboxDriveImportError(e), { cause: e });
    }
    const contentMd5 = meta.md5Checksum?.trim() || file.md5Checksum?.trim();
    const dedupeKey = drivePdfDedupeKey(file);

    if (
      dedupIndex.driveMediaIds.has(mediaFileId) ||
      (dedupeKey && dedupIndex.driveMediaIds.has(dedupeKey)) ||
      (contentMd5 && dedupIndex.contentMd5.has(contentMd5.toLowerCase()))
    ) {
      skipped += 1;
      registerDriveCandidateOnDedupIndex(dedupIndex, file, mediaFileId, contentMd5);
      continue;
    }

    let bytes: ArrayBuffer;
    try {
      bytes = await driveGetMediaArrayBuffer(accessToken, mediaFileId);
    } catch (e) {
      if (e instanceof DriveHttpError && (e.status === 403 || e.status === 401)) {
        throw new Error(formatZineboxDriveImportError(e), { cause: e });
      }
      throw e;
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const pdfFile = new File([blob], name, { type: 'application/pdf' });
    const id = `comic-${crypto.randomUUID()}`;
    const coverThumbnailBase64 = await extractPdfCoverThumbnail(pdfFile);
    const fileSizeBytes = parseDriveSizeBytes(meta.size) ?? parseDriveSizeBytes(file.size) ?? pdfFile.size;
    const comic: ZineboxComic = {
      id,
      title: titleFromPdfFilename(name) || 'Untitled zine',
      source: resolveComicSource(file, scan.folderName, metadata),
      fileId: id,
      filename: name,
      coverThumbnailBase64,
      readStatus: 'unread',
      progressPercentage: 0,
      storageKind: 'local',
      driveFileId,
      driveMediaFileId: mediaFileId,
      contentMd5: contentMd5?.toLowerCase(),
      fileSizeBytes,
      tags: tags.length > 0 ? tags : undefined,
    };
    await zineboxDb.transaction('rw', zineboxDb.comics, zineboxDb.comicFiles, async () => {
      await zineboxDb.comics.put(comic);
      await zineboxDb.comicFiles.put({ comicId: id, blob: pdfFile });
    });
    registerDriveCandidateOnDedupIndex(dedupIndex, file, mediaFileId, contentMd5);
    imported += 1;
  }

  if (imported > 0) notifyZineboxLocalChange({ immediate: true });

  return { imported, skipped, folderName: scan.folderName };
}
