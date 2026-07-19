import type { BlockingJobItemProgress } from '../../shared/jobs/labsBlockingJobItemProgress';
import { zineboxDb } from '../db/zineboxDb';
import { notifyZineboxLocalChange } from '../db/zineboxChangeBus';
import { loadPdfJs } from '../reader/pdfRender';
import type { ZineboxComic } from '../types';
import type { ZineboxImportBatchMetadata } from './zineboxImportMetadata';
import { DEFAULT_ZINEBOX_IMPORT_METADATA } from './zineboxImportMetadata';
import {
  dedupeLocalPdfFiles,
  isLocalPdfAlreadyImported,
  loadZineboxImportDedupIndex,
  registerLocalFileOnDedupIndex,
} from './zineboxImportDedup';
import { normalizeZineboxTags } from '../utils/zineboxTags';

const FALLBACK_COVER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMjQwIiB2aWV3Qm94PSIwIDAgMTYwIDI0MCI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIyNDAiIGZpbGw9IiNlOGU0ZGYiLz48L3N2Zz4=';

export function titleFromPdfFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function extractPdfCoverThumbnail(file: File): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return FALLBACK_COVER;
    context.fillStyle = '#f5f3ef';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return FALLBACK_COVER;
  }
}

export type ImportLocalPdfResult = {
  imported: number;
  skipped: number;
};

export async function importLocalPdfFiles(
  files: readonly File[],
  metadata: ZineboxImportBatchMetadata = DEFAULT_ZINEBOX_IMPORT_METADATA,
  options?: { skipDedup?: boolean; onProgress?: (progress: BlockingJobItemProgress) => void },
): Promise<ImportLocalPdfResult> {
  let toImport = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
  let skipped = 0;
  const index = await loadZineboxImportDedupIndex();

  if (!options?.skipDedup) {
    const deduped = dedupeLocalPdfFiles(files, index);
    toImport = deduped.toImport;
    skipped = deduped.skippedLibrary + deduped.skippedBatch;
  }

  const pending: File[] = [];
  for (const file of toImport) {
    if (options?.skipDedup && isLocalPdfAlreadyImported(file, index)) {
      skipped += 1;
      continue;
    }
    pending.push(file);
  }

  const tags = normalizeZineboxTags(metadata.tags);
  const batchSource = metadata.source.trim() || 'Local';
  let imported = 0;

  for (const [fileIndex, file] of pending.entries()) {
    options?.onProgress?.({
      current: fileIndex + 1,
      total: pending.length,
      detail: file.name,
    });
    const id = `comic-${crypto.randomUUID()}`;
    const coverThumbnailBase64 = await extractPdfCoverThumbnail(file);
    const comic: ZineboxComic = {
      id,
      title: titleFromPdfFilename(file.name) || 'Untitled zine',
      source: batchSource,
      fileId: id,
      filename: file.name,
      coverThumbnailBase64,
      readStatus: 'unread',
      progressPercentage: 0,
      storageKind: 'local',
      fileSizeBytes: file.size > 0 ? file.size : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
    await zineboxDb.transaction('rw', zineboxDb.comics, zineboxDb.comicFiles, async () => {
      await zineboxDb.comics.put(comic);
      await zineboxDb.comicFiles.put({ comicId: id, blob: file });
    });
    registerLocalFileOnDedupIndex(index, file);
    imported += 1;
  }

  if (imported > 0) notifyZineboxLocalChange({ immediate: true });

  return { imported, skipped };
}
