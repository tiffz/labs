import { ENCORE_ACCOMPANIMENT_TAGS, type EncoreAccompanimentTag } from '../types';

const RESERVED_KEY_RE = /^(Venue|Artist|Accompaniment|Date|Key|Tags)\s-\s(.+)$/i;

const ISO_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidCalendarYmd(s: string): boolean {
  const m = s.trim().match(ISO_YMD);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

const ACCOMPANIMENT_BY_LOWER = new Map<string, EncoreAccompanimentTag>(
  ENCORE_ACCOMPANIMENT_TAGS.map((t) => [t.toLowerCase(), t]),
);

function parseAccompanimentValue(raw: string): EncoreAccompanimentTag[] {
  const out: EncoreAccompanimentTag[] = [];
  const seen = new Set<EncoreAccompanimentTag>();
  for (const part of raw.split(',')) {
    const t = ACCOMPANIMENT_BY_LOWER.get(part.trim().toLowerCase());
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function parseTagsValue(raw: string): string[] {
  const out: string[] = [];
  const seenLower = new Set<string>();
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (t.length < 1) continue;
    const low = t.toLowerCase();
    if (seenLower.has(low)) continue;
    seenLower.add(low);
    out.push(t);
  }
  return out;
}

export interface ParsedFolderMetadata {
  venue?: string;
  artist?: string;
  accompaniment?: EncoreAccompanimentTag[];
  date?: string;
  performanceKey?: string;
  tags?: string[];
  /**
   * Folder segments that were **not** recognized `Key - Value` metadata, joined like the Drive walker
   * (`Show / Subfolder / `) so fuzzy venue matching still works on plain folder names.
   */
  residualPathHint: string;
}

/**
 * Parses optional Drive folder breadcrumb metadata for bulk import.
 *
 * Any folder segment matching `ReservedKey - Value` (case-insensitive key, literal space-hyphen-space)
 * sets that field; **deepest folder wins** when the same key appears multiple times.
 * Other segments are passed through in {@link ParsedFolderMetadata.residualPathHint}.
 *
 * Recognized keys: `Venue`, `Artist`, `Accompaniment`, `Date`, `Key`, `Tags`.
 */
export function parseEncoreFolderMetadata(parentPathHint: string): ParsedFolderMetadata {
  const segments = parentPathHint
    .split(/\s*\/\s*/g)
    .map((s) => s.trim())
    .filter(Boolean);

  let venue: string | undefined;
  let artist: string | undefined;
  let accompaniment: EncoreAccompanimentTag[] | undefined;
  let date: string | undefined;
  let performanceKey: string | undefined;
  let tags: string[] | undefined;

  const residualSegs: string[] = [];

  for (const seg of segments) {
    const m = seg.match(RESERVED_KEY_RE);
    if (!m) {
      residualSegs.push(seg);
      continue;
    }
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (!value) continue;

    switch (key) {
      case 'venue':
        venue = value;
        break;
      case 'artist':
        artist = value;
        break;
      case 'accompaniment': {
        const next = parseAccompanimentValue(value);
        if (next.length) accompaniment = next;
        break;
      }
      case 'date':
        if (isValidCalendarYmd(value)) {
          const ymd = value.trim().match(ISO_YMD)!;
          date = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
        }
        break;
      case 'key':
        performanceKey = value;
        break;
      case 'tags': {
        const next = parseTagsValue(value);
        if (next.length) tags = next;
        break;
      }
      default:
        residualSegs.push(seg);
    }
  }

  const residualPathHint =
    residualSegs.length > 0 ? `${residualSegs.join(' / ')} / ` : '';

  return {
    venue,
    artist,
    accompaniment,
    date,
    performanceKey,
    tags,
    residualPathHint,
  };
}
