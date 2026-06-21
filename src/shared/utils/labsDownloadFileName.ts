const INVALID_FILENAME_CHAR = /[\\/:*?"<>|]/;
const MAX_FILENAME_STEM_LEN = 180;

function isInvalidFilenameChar(ch: string): boolean {
  return ch.charCodeAt(0) < 32 || INVALID_FILENAME_CHAR.test(ch);
}

/** Strip characters illegal in cross-platform download filenames; keep readable spacing. */
export function sanitizeLabsDownloadFileStem(value: string): string {
  const stripped = [...value].map((ch) => (isInvalidFilenameChar(ch) ? ' ' : ch)).join('');
  return stripped.replace(/\s+/g, ' ').trim();
}

/**
 * Build a human-readable download filename from ordered parts joined with ` - `.
 * Example: `buildLabsDownloadFileName(['A Thousand Castles', 'Chord Chart'], 'pdf')`
 * → `A Thousand Castles - Chord Chart.pdf`
 */
export function buildLabsDownloadFileName(parts: readonly string[], extension?: string): string {
  const stem = parts
    .map((part) => sanitizeLabsDownloadFileStem(part))
    .filter(Boolean)
    .join(' - ')
    .slice(0, MAX_FILENAME_STEM_LEN);
  const safeStem = stem || 'Download';
  if (!extension) return safeStem;
  const normalizedExt = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${safeStem}.${normalizedExt}`;
}

/** Append an extension to an already-built stem (no part joining). */
export function labsDownloadFileNameWithExtension(stem: string, extension: string): string {
  const safeStem = sanitizeLabsDownloadFileStem(stem).slice(0, MAX_FILENAME_STEM_LEN) || 'Download';
  const normalizedExt = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${safeStem}.${normalizedExt}`;
}

export function buildChordChartDownloadFileName(songTitle: string): string {
  return buildLabsDownloadFileName([songTitle.trim() || 'Untitled', 'Chord Chart']);
}
