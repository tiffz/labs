import type { EncorePerformance, EncoreSong } from '../types';

/**
 * Strips characters Drive disallows or that read poorly in a filename.
 * Drive itself accepts most characters but we keep things readable in My Drive lists.
 */
function sanitizeForFilename(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FIELD_SEP = ' - ';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build the canonical performance video filename used inside `Encore_App/Performances/`.
 *
 * Format: `YYYY-MM-DD - Title - Artist.ext` (same `Title - Artist` spine as chart files; venue is not encoded
 * in the filename — use folder metadata during bulk import, see `encoreFolderMetadata.ts`).
 *
 * Artist is always present (`Unknown artist` when missing on the song). Venue is intentionally omitted.
 *
 * - `extension` should include the leading dot for real files (".mp4"); empty for shortcuts.
 * - Truncated to a sensible length so Drive doesn't reject it.
 */
export function buildPerformanceVideoName(
  performance: Pick<EncorePerformance, 'date' | 'venueTag'>,
  song: Pick<EncoreSong, 'title' | 'artist'> | null,
  extension = '',
): string {
  const date = ISO_DATE.test(performance.date) ? performance.date : 'Undated';
  const title = sanitizeForFilename((song?.title ?? '').trim() || 'Untitled song');
  const artist = sanitizeForFilename((song?.artist ?? '').trim() || 'Unknown artist');
  const parts = [date, title, artist];
  let base = parts.join(FIELD_SEP);
  const MAX_LEN = 200;
  if (base.length > MAX_LEN) base = `${base.slice(0, MAX_LEN - 1)}…`;
  return `${base}${extension}`;
}

/** Splits a Drive file name into "stem" and ".ext" (extension empty if none). */
export function splitFileNameExtension(name: string): { stem: string; extension: string } {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) {
    return { stem: name, extension: '' };
  }
  const ext = name.slice(lastDot);
  if (/[\\/]/.test(ext) || ext.length > 6) return { stem: name, extension: '' };
  return { stem: name.slice(0, lastDot), extension: ext };
}
