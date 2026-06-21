import type { EncoreFilterFieldConfig } from '../ui/EncoreFilterChipBar';
import {
  encoreDateRangeToFilterRecord,
  type EncoreDateRangeFilterValue,
} from './encoreDateRangeFilter';

/** Date-range filter field — values live in `${id}After` / `${id}Before` string arrays. */
export function encoreDateRangeFilterField(id: string, label: string): EncoreFilterFieldConfig {
  return {
    id,
    label,
    kind: 'dateRange',
    options: [],
    allowEmptyOptions: true,
  };
}

export function isEncoreDateRangeFilterField(field: EncoreFilterFieldConfig): boolean {
  return field.kind === 'dateRange';
}

export function patchEncoreFilterDateRange(
  prev: Record<string, string[]>,
  fieldId: string,
  range: EncoreDateRangeFilterValue,
): Record<string, string[]> {
  return { ...prev, ...encoreDateRangeToFilterRecord(fieldId, range) };
}
