/** Local calendar date ↔ ISO timestamp for publish log entries. */

export function isoToDateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateInputValueToIso(value: string): string {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return new Date().toISOString();
  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

/** Parse user-typed dates (YYYY-MM-DD preferred). Returns ISO string or null. */
export function parsePublishDateText(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map((part) => Number(part));
    if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0).toISOString();
}

export function todayDateInputValue(): string {
  return isoToDateInputValue(new Date().toISOString());
}

export function formatPublishDateDisplay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return isoToDateInputValue(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Earliest `publishedAt` across publish-log entries, or null when empty. */
export function earliestPublishDateIso(
  entries: readonly { publishedAt: string }[],
): string | null {
  if (entries.length === 0) return null;
  let earliest = entries[0]!.publishedAt;
  for (let i = 1; i < entries.length; i += 1) {
    const candidate = entries[i]!.publishedAt;
    if (candidate < earliest) earliest = candidate;
  }
  return earliest;
}
