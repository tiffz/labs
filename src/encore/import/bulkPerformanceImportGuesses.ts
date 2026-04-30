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

function formatYmd(y: number, month1: number, day: number): string {
  const mo = String(month1).padStart(2, '0');
  const da = String(day).padStart(2, '0');
  return `${y}-${mo}-${da}`;
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
 * Best-effort date from file names, paths, or descriptions (numeric or “Sep 17, 2024” style).
 */
export function guessDateFromImportText(text: string): string | null {
  const ymd = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const mo = Number(ymd[2]);
    const da = Number(ymd[3]);
    if (y >= 1970 && y <= 2100 && mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return formatYmd(y, mo, da);
    }
  }

  const monFirst = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (monFirst) {
    const token = monFirst[1]!.toLowerCase();
    const month1 = MONTH_TOKEN_TO_INDEX[token];
    const day = Number(monFirst[2]);
    const y = Number(monFirst[3]);
    if (month1 && day >= 1 && day <= 31 && y >= 1970 && y <= 2100) {
      return formatYmd(y, month1, day);
    }
  }

  const dmy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (dmy) {
    let mo = Number(dmy[1]);
    let da = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    if (mo > 12 && da <= 12) {
      const t = mo;
      mo = da;
      da = t;
    }
    if (y >= 1970 && y <= 2100 && mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return formatYmd(y, mo, da);
    }
  }

  return null;
}

export function performanceCalendarDateForBulkRow(opts: {
  fileName: string;
  matchHaystack: string;
  driveCreatedTime?: string;
  driveModifiedTime?: string;
}): string {
  return (
    guessDateFromImportText(opts.fileName) ??
    guessDateFromImportText(opts.matchHaystack) ??
    (opts.driveCreatedTime?.trim()
      ? calendarDateFromIsoTimestamp(opts.driveCreatedTime)
      : null) ??
    (opts.driveModifiedTime?.trim()
      ? calendarDateFromIsoTimestamp(opts.driveModifiedTime)
      : null) ??
    calendarDateFromIsoTimestamp(undefined)
  );
}
