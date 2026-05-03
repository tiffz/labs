/**
 * Best-effort ISO calendar date (YYYY-MM-DD) from file names, folder paths, descriptions, etc.
 * Uses real calendar validation (rejects 2024-02-31). Prefer this anywhere free text may contain a date.
 */

/** Month token → 1-based month index (1 = January). */
const MONTH_TOKEN_TO_INDEX: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH_ALT = String.raw`jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?`;

function formatYmd(y: number, month1: number, day: number): string {
  const mo = String(month1).padStart(2, '0');
  const da = String(day).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function tryYmd(y: number, month1: number, day: number): string | null {
  if (y < 1970 || y > 2100 || month1 < 1 || month1 > 12 || day < 1 || day > 31) return null;
  const dt = new Date(y, month1 - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== month1 - 1 || dt.getDate() !== day) return null;
  return formatYmd(y, month1, day);
}

function monthIndex(token: string): number | null {
  const m1 = MONTH_TOKEN_TO_INDEX[token.toLowerCase()];
  return m1 ?? null;
}

/**
 * Calendar date in the **local** timezone from an RFC3339 instant (Drive `createdTime` / `modifiedTime`).
 * Prefer this over slicing `YYYY-MM-DD` from the string, which follows UTC and can be off by one day.
 */
export function calendarDateFromIsoTimestamp(iso?: string): string {
  const d = iso?.trim() ? new Date(iso.trim()) : new Date();
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    return formatYmd(fallback.getFullYear(), fallback.getMonth() + 1, fallback.getDate());
  }
  return formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Extract `YYYY-MM-DD` from arbitrary text (numeric and common English month formats).
 */
export function guessIsoDateFromFreeText(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const ymdSep = t.match(/(?<![0-9])(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})(?![0-9])/);
  if (ymdSep) {
    const y = Number(ymdSep[1]);
    const mo = Number(ymdSep[2]);
    const da = Number(ymdSep[3]);
    const out = tryYmd(y, mo, da);
    if (out) return out;
  }

  const ymdCompact = t.match(/(?<![0-9])((?:19|20)\d{2})(\d{2})(\d{2})(?![0-9])/);
  if (ymdCompact) {
    const y = Number(ymdCompact[1]);
    const mo = Number(ymdCompact[2]);
    const da = Number(ymdCompact[3]);
    const out = tryYmd(y, mo, da);
    if (out) return out;
  }

  const monFirst = t.match(
    new RegExp(
      String.raw`\b(${MONTH_ALT})(?:\.|,)?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b`,
      'i',
    ),
  );
  if (monFirst) {
    const month1 = monthIndex(monFirst[1]!);
    const day = Number(monFirst[2]);
    const y = Number(monFirst[3]);
    if (month1 && day >= 1 && day <= 31 && y >= 1970 && y <= 2100) {
      const out = tryYmd(y, month1, day);
      if (out) return out;
    }
  }

  const dayFirst = t.match(
    new RegExp(
      String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(${MONTH_ALT})(?:\.|,)?\s+(\d{4})\b`,
      'i',
    ),
  );
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month1 = monthIndex(dayFirst[2]!);
    const y = Number(dayFirst[3]);
    if (month1 && day >= 1 && day <= 31 && y >= 1970 && y <= 2100) {
      const out = tryYmd(y, month1, day);
      if (out) return out;
    }
  }

  const dmy = t.match(/(?<![0-9])(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?![0-9])/);
  if (dmy) {
    let mo = Number(dmy[1]);
    let da = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    if (mo > 12 && da <= 12) {
      const swap = mo;
      mo = da;
      da = swap;
    }
    const out = tryYmd(y, mo, da);
    if (out) return out;
  }

  return null;
}
