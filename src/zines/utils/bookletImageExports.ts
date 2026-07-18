import type { MixamZipEntry } from '../../shared/zine';
import {
  blankPageDataUrl,
  buildMixamZipBlob,
  bookletReadingPagesToSpreadViews,
  combineToSpreadImage,
  composeVerticalScrollBlob,
  downloadBlob,
  loadImageFromDataUrl,
  splitSpreadImage,
} from '../../shared/zine';
import type { BookletPageInfo, SpreadInfo } from '../types';
import { buildBookPages } from './spreadPairing';
import {
  buildBookletPageZipEntries,
  downloadBookletPagesZip,
} from './bookletPagesZip';

export { buildBookletPageZipEntries, downloadBookletPagesZip };
export { composeVerticalScrollBlob } from '../../shared/zine';

function safeBaseName(baseFileName: string): string {
  return baseFileName.replace(/\.[^.]+$/, '').trim() || 'booklet';
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
        : blankPageDataUrl(refWidth, refHeight, blankPageColor);
    const rightUrl =
      right && !right.isBlank && right.imageUrl
        ? right.imageUrl
        : blankPageDataUrl(refWidth, refHeight, blankPageColor);

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
