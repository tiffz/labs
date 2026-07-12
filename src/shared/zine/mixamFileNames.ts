import { getBookletPageFileStem } from './bookletPageLabels';

/** Single-page Mixam filename stem + extension (e.g. `page1.png`). */
export function createMixamPageFileName(pageNum: number, extension = 'png'): string {
  return `${getBookletPageFileStem(pageNum)}.${extension}`;
}

/** Spread Mixam filename (e.g. `page2-page3.png`). */
export function createMixamSpreadFileName(
  leftPageNum: number,
  rightPageNum: number,
  extension = 'png',
): string {
  const left = getBookletPageFileStem(leftPageNum);
  const right = getBookletPageFileStem(rightPageNum);
  return `${left}-${right}.${extension}`;
}

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

/**
 * Derive a Mixam-style filename from a Lyrefly page display name.
 * Falls back to a slug when the label is not a standard booklet name.
 */
export function mixamFileNameFromDisplayName(
  displayName: string,
  options?: { isSpread?: boolean; mimeType?: string },
): string {
  const ext = extensionFromMime(options?.mimeType ?? 'image/png');
  const normalized = displayName.trim().toLowerCase();

  if (normalized === 'front cover' || normalized === 'front' || normalized === 'cover') {
    return `front.${ext}`;
  }
  if (normalized === 'back cover' || normalized === 'back') {
    return `back.${ext}`;
  }
  if (normalized === 'inner front' || normalized === 'innerfront') {
    return `innerfront.${ext}`;
  }
  if (normalized === 'inner back' || normalized === 'innerback') {
    return `innerback.${ext}`;
  }

  const spreadMatch = normalized.match(/page\s*(\d+)\s*[-–]\s*page\s*(\d+)/);
  if (spreadMatch || options?.isSpread) {
    if (spreadMatch) {
      return `page${spreadMatch[1]}-${spreadMatch[2]}.${ext}`;
    }
  }

  const pageMatch = normalized.match(/^page\s*(\d+)$/);
  if (pageMatch) {
    return `page${pageMatch[1]}.${ext}`;
  }

  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'page'}.${ext}`;
}
