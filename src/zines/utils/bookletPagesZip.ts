import type { MixamZipEntry } from '../../shared/zine';
import {
  buildMixamZipBlob,
  createMixamPageFileName,
  createMixamSpreadFileName,
  downloadBlob,
  mixamFileNameFromDisplayName,
} from '../../shared/zine';
import type { BookletPageInfo, SpreadInfo } from '../types';
import { buildBookPages } from './spreadPairing';

function extensionFromBlobOrDataUrl(blob: Blob, dataUrl: string): string {
  const mime = blob.type || dataUrl.slice(5, dataUrl.indexOf(';'));
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

function uniqueFileName(preferred: string, used: Set<string>): string {
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  const dot = preferred.lastIndexOf('.');
  const stem = dot >= 0 ? preferred.slice(0, dot) : preferred;
  const ext = dot >= 0 ? preferred.slice(dot) : '';
  let n = 2;
  let candidate = `${stem}-${n}${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${stem}-${n}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

function fileNameForBookPage(
  page: { id: string; label: string; isSpread?: boolean },
  extension: string,
): string {
  const spreadMatch = page.id.match(/^spread-(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/);
  if (spreadMatch) {
    return createMixamSpreadFileName(
      Number(spreadMatch[1]),
      Number(spreadMatch[2]),
      extension,
    );
  }
  const pageMatch = page.id.match(/^page-(-?\d+(?:\.\d+)?)$/);
  if (pageMatch) {
    return createMixamPageFileName(Number(pageMatch[1]), extension);
  }
  // Covers use labels (Front Cover) while ids may be `page-0`
  return mixamFileNameFromDisplayName(page.label || 'page', {
    isSpread: page.isSpread,
    mimeType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  }).replace(/\.[^.]+$/, `.${extension}`);
}

/**
 * Reading-order page/spread images for a booklet ZIP (skips blank padding).
 */
export async function buildBookletPageZipEntries(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
): Promise<MixamZipEntry[]> {
  const bookPages = buildBookPages(pages, spreads).filter(
    (page) => !page.isBlank && Boolean(page.imageData),
  );
  const usedNames = new Set<string>();
  const entries: MixamZipEntry[] = [];

  for (const page of bookPages) {
    const blob = await fetch(page.imageData).then((response) => response.blob());
    const ext = extensionFromBlobOrDataUrl(blob, page.imageData);
    entries.push({
      fileName: uniqueFileName(fileNameForBookPage(page, ext), usedNames),
      blob,
    });
  }

  return entries;
}

export async function downloadBookletPagesZip(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  baseFileName: string,
): Promise<{ entryCount: number; fileName: string }> {
  const entries = await buildBookletPageZipEntries(pages, spreads);
  if (entries.length === 0) {
    throw new Error('No page images to download');
  }
  const zipBlob = await buildMixamZipBlob(entries);
  const safeBase = baseFileName.replace(/\.[^.]+$/, '').trim() || 'booklet';
  const fileName = `${safeBase}-pages.zip`;
  downloadBlob(zipBlob, fileName);
  return { entryCount: entries.length, fileName };
}
