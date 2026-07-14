import type { MixamZipEntry } from '../../shared/zine';
import {
  buildMixamZipBlob,
  bookletReadingPagesToSpreadViews,
  downloadBlob,
} from '../../shared/zine';
import { MAX_EXPORT_CANVAS_DIMENSION } from '../constants';
import type { BookletPageInfo, SpreadInfo } from '../types';
import {
  combineToSpreadImage,
  loadImageFromDataUrl,
  splitSpreadImage,
} from './imageManipulation';
import { buildBookPages } from './spreadPairing';
import {
  buildBookletPageZipEntries,
  downloadBookletPagesZip,
} from './bookletPagesZip';

export { buildBookletPageZipEntries, downloadBookletPagesZip };

const DEFAULT_STRIP_MAX_WIDTH = 1200;
const DEFAULT_JPEG_QUALITY = 0.92;

function safeBaseName(baseFileName: string): string {
  return baseFileName.replace(/\.[^.]+$/, '').trim() || 'booklet';
}

function blankDataUrl(width: number, height: number, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = color || '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function slugLabel(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page'
  );
}

/** Non-blank reading segments top-to-bottom (linked spreads are split left→right). */
export async function collectVerticalScrollSegments(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
): Promise<string[]> {
  const bookPages = buildBookPages(pages, spreads).filter(
    (page) => !page.isBlank && Boolean(page.imageData),
  );
  const segments: string[] = [];
  for (const page of bookPages) {
    if (page.isSpread) {
      const [left, right] = await splitSpreadImage(page.imageData);
      segments.push(left, right);
    } else {
      segments.push(page.imageData);
    }
  }
  return segments;
}

/** Stack page images into one long vertical scroll JPEG. */
export async function composeVerticalScrollBlob(
  segmentDataUrls: readonly string[],
  options?: { maxWidthPx?: number; jpegQuality?: number },
): Promise<Blob> {
  if (segmentDataUrls.length === 0) {
    throw new Error('No page images to stitch');
  }

  const maxWidthPx = options?.maxWidthPx ?? DEFAULT_STRIP_MAX_WIDTH;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const images = await Promise.all(segmentDataUrls.map((url) => loadImageFromDataUrl(url)));

  const targetWidth = Math.min(
    maxWidthPx,
    Math.max(...images.map((img) => img.width)),
    MAX_EXPORT_CANVAS_DIMENSION,
  );

  const scaledHeights = images.map((img) =>
    Math.max(1, Math.round((img.height * targetWidth) / img.width)),
  );
  let totalHeight = scaledHeights.reduce((sum, h) => sum + h, 0);
  let width = targetWidth;
  let heightScale = 1;

  if (totalHeight > MAX_EXPORT_CANVAS_DIMENSION) {
    heightScale = MAX_EXPORT_CANVAS_DIMENSION / totalHeight;
    width = Math.max(1, Math.round(targetWidth * heightScale));
    totalHeight = MAX_EXPORT_CANVAS_DIMENSION;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let y = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    const drawH = Math.max(1, Math.round(scaledHeights[i]! * heightScale));
    const drawW = width;
    ctx.drawImage(img, 0, y, drawW, drawH);
    y += drawH;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Failed to encode vertical scroll image'));
          return;
        }
        resolve(result);
      },
      'image/jpeg',
      jpegQuality,
    );
  });
  return blob;
}

export async function downloadBookletVerticalScroll(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  baseFileName: string,
): Promise<{ fileName: string }> {
  const segments = await collectVerticalScrollSegments(pages, spreads);
  const blob = await composeVerticalScrollBlob(segments);
  const fileName = `${safeBaseName(baseFileName)}-scroll.jpg`;
  downloadBlob(blob, fileName);
  return { fileName };
}

/**
 * Facing-page spreads in reading order (includes blank pads facing a real page).
 */
export async function buildBookletSpreadZipEntries(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  blankPageColor = '#FFFFFF',
): Promise<MixamZipEntry[]> {
  const readingPages = buildBookPages(pages, spreads).map((page) => ({
    id: page.id,
    imageUrl: page.imageData,
    label: page.label,
    isBlank: page.isBlank,
    isSpread: page.isSpread,
  }));
  const views = bookletReadingPagesToSpreadViews(readingPages);
  const entries: MixamZipEntry[] = [];
  let index = 0;

  for (const view of views) {
    if (view.isSpread) {
      if (!view.left.imageUrl) continue;
      index += 1;
      const blob = await fetch(view.left.imageUrl).then((r) => r.blob());
      const ext = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
      entries.push({
        fileName: `${String(index).padStart(2, '0')}-${slugLabel(view.left.label || 'spread')}.${ext}`,
        blob,
      });
      continue;
    }

    const left = view.left;
    const right = view.right;
    if ((!left || left.isBlank) && (!right || right.isBlank)) continue;

    let refWidth = 1000;
    let refHeight = 1500;
    for (const side of [left, right]) {
      if (side && !side.isBlank && side.imageUrl) {
        const img = await loadImageFromDataUrl(side.imageUrl);
        refWidth = img.width;
        refHeight = img.height;
        break;
      }
    }

    const leftUrl =
      left && !left.isBlank && left.imageUrl
        ? left.imageUrl
        : blankDataUrl(refWidth, refHeight, blankPageColor);
    const rightUrl =
      right && !right.isBlank && right.imageUrl
        ? right.imageUrl
        : blankDataUrl(refWidth, refHeight, blankPageColor);

    const combined = await combineToSpreadImage(leftUrl, rightUrl);
    const blob = await fetch(combined).then((r) => r.blob());
    index += 1;
    const leftSlug = slugLabel(left?.label || 'blank');
    const rightSlug = slugLabel(right?.label || 'blank');
    entries.push({
      fileName: `${String(index).padStart(2, '0')}-${leftSlug}-${rightSlug}.png`,
      blob,
    });
  }

  return entries;
}

export async function downloadBookletSpreadsZip(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  baseFileName: string,
  blankPageColor = '#FFFFFF',
): Promise<{ entryCount: number; fileName: string }> {
  const entries = await buildBookletSpreadZipEntries(pages, spreads, blankPageColor);
  if (entries.length === 0) {
    throw new Error('No spreads to download');
  }
  const zipBlob = await buildMixamZipBlob(entries);
  const fileName = `${safeBaseName(baseFileName)}-spreads.zip`;
  downloadBlob(zipBlob, fileName);
  return { entryCount: entries.length, fileName };
}
