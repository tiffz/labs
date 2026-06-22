import { originalTakeDisplayName } from '../originals/originalsTakeDisplay';

function stripTitlePrefix(cleaned: string, title: string): string | null {
  const t = title.trim();
  if (!t) return cleaned;
  if (cleaned.localeCompare(t, undefined, { sensitivity: 'accent' }) === 0) return null;

  const lowerCleaned = cleaned.toLowerCase();
  const lowerTitle = t.toLowerCase();
  if (lowerCleaned.startsWith(lowerTitle)) {
    const suffix = cleaned.slice(t.length).replace(/^[\s\-–—]+/, '').trim();
    return suffix || null;
  }
  return cleaned;
}

/** User-facing queue line under the song title (strips extensions and title-prefix noise). */
export function encoreMediaQueueSubtitle(subtitle?: string, title?: string): string | null {
  const raw = subtitle?.trim();
  if (!raw) return null;
  const cleaned = originalTakeDisplayName(raw);
  if (!cleaned) return null;
  return stripTitlePrefix(cleaned, title ?? '');
}

const MONTH_PREFIX =
  /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i;

function isLikelyRecordingDateFragment(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\d{1,2}$/.test(trimmed)) return false;
  if (MONTH_PREFIX.test(trimmed)) return true;
  if (/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(trimmed)) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  return false;
}

/**
 * Queue secondary line — only when the demo take adds info beyond the song title.
 * Recording dates are labeled so sporadic hints read consistently.
 */
export function encoreMediaQueueTakeHint(subtitle?: string, title?: string): string | null {
  const suffix = encoreMediaQueueSubtitle(subtitle, title);
  if (!suffix) return null;
  if (/^\d{1,2}$/.test(suffix)) return null;
  if (isLikelyRecordingDateFragment(suffix)) return `Take · ${suffix}`;
  if (suffix.length <= 3) return null;
  return suffix;
}

export const ENCORE_QUEUE_UP_NEXT_LABEL = 'Up next';
