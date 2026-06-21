/** Inclusive calendar-day bounds for list filtering (`YYYY-MM-DD`). */
export type EncoreDateRangeFilterValue = {
  after?: string;
  before?: string;
};

export function isEncoreDateRangeActive(range: EncoreDateRangeFilterValue): boolean {
  return Boolean(range.after?.trim() || range.before?.trim());
}

/** Normalize ISO timestamp or YYYY-MM-DD to calendar day for comparisons. */
export function encoreCalendarDayFromIso(iso: string): string | null {
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const day = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function encoreDateInRange(iso: string, range: EncoreDateRangeFilterValue): boolean {
  const day = encoreCalendarDayFromIso(iso);
  if (!day) return false;
  if (range.after && day < range.after) return false;
  if (range.before && day > range.before) return false;
  return true;
}

export type EncoreDateRangePresetId =
  | 'any'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export function encoreDateRangeFromPreset(
  presetId: EncoreDateRangePresetId,
  now = new Date(),
): EncoreDateRangeFilterValue {
  const today = now.toISOString().slice(0, 10);
  const y = now.getFullYear();
  switch (presetId) {
    case 'any':
      return {};
    case 'last7':
      return { after: shiftCalendarDay(today, -7) };
    case 'last30':
      return { after: shiftCalendarDay(today, -30) };
    case 'last90':
      return { after: shiftCalendarDay(today, -90) };
    case 'thisYear':
      return { after: `${y}-01-01`, before: `${y}-12-31` };
    case 'lastYear':
      return { after: `${y - 1}-01-01`, before: `${y - 1}-12-31` };
    case 'custom':
      return {};
    default:
      return {};
  }
}

function shiftCalendarDay(isoDay: string, deltaDays: number): string {
  const d = new Date(`${isoDay}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function summarizeEncoreDateRange(range: EncoreDateRangeFilterValue): string {
  if (!isEncoreDateRangeActive(range)) return 'Any time';
  const { after, before } = range;
  if (after && before) return `${formatChipDay(after)} – ${formatChipDay(before)}`;
  if (after) return `After ${formatChipDay(after)}`;
  if (before) return `Before ${formatChipDay(before)}`;
  return 'Any time';
}

function formatChipDay(isoDay: string): string {
  try {
    const d = new Date(`${isoDay}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDay;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoDay;
  }
}

export const ENCORE_DATE_RANGE_PRESETS: ReadonlyArray<{ id: EncoreDateRangePresetId; label: string }> = [
  { id: 'any', label: 'Any time' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'thisYear', label: 'This year' },
  { id: 'lastYear', label: 'Last year' },
  { id: 'custom', label: 'Custom range…' },
];

/** Read after/before keys stored as `${fieldId}After` / `${fieldId}Before` string arrays. */
export function encoreDateRangeFromFilterRecord(
  values: Record<string, string[]>,
  fieldId: string,
): EncoreDateRangeFilterValue {
  const after = values[`${fieldId}After`]?.[0]?.trim();
  const before = values[`${fieldId}Before`]?.[0]?.trim();
  return {
    after: after || undefined,
    before: before || undefined,
  };
}

export function encoreDateRangeToFilterRecord(
  fieldId: string,
  range: EncoreDateRangeFilterValue,
): Record<string, string[]> {
  return {
    [`${fieldId}After`]: range.after ? [range.after] : [],
    [`${fieldId}Before`]: range.before ? [range.before] : [],
  };
}

/** Legacy year-only chip → inclusive calendar-year range. */
export function encoreDateRangeFromCalendarYear(year: string): EncoreDateRangeFilterValue {
  if (!/^\d{4}$/.test(year)) return {};
  return { after: `${year}-01-01`, before: `${year}-12-31` };
}
