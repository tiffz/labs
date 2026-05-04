import type { MRT_ColumnDef } from 'material-react-table';
import type { EncoreAccompanimentTag, EncorePerformance, EncoreSong } from '../types';
import {
  MRT_ROW_SELECT_COL,
  ensureEncoreMrtRowActionsInOrder,
  ensureEncoreMrtSelectLeading,
  normalizeEncoreMrtColumnOrder,
  withEncoreMrtTrailingSpacer,
} from './encoreMrtColumnOrder';

export type PerformancesViewMode = 'table' | 'grid';

export type PerfMrtRow = {
  perf: EncorePerformance;
  song: EncoreSong | null;
  date: string;
  songLabel: string;
  artistLabel: string;
  venue: string;
  accompaniment: EncoreAccompanimentTag[];
};

export const getPerfRowId = (row: PerfMrtRow): string => row.perf.id;

/** Older prefs defaulted to song title A→Z; replace with newest-first date for Activity. */
export function normalizePerformancesTableSorting(
  sorting: Array<{ id: string; desc: boolean }> | undefined,
): Array<{ id: string; desc: boolean }> {
  const def = [{ id: 'date', desc: true }];
  if (!sorting?.length) return def;
  if (sorting.length === 1 && sorting[0]?.id === 'songLabel' && sorting[0]?.desc === false) return def;
  return sorting;
}

/** Controlled column order for MRT: prefs only list data columns; inject display columns so checkboxes stay first. */
export function performancesColumnOrderForMrt(
  viewMode: PerformancesViewMode,
  perfColOrder: string[] | undefined,
  perfDefaultColumnOrder: string[],
): string[] {
  const base = perfColOrder ?? perfDefaultColumnOrder;
  if (viewMode !== 'table') {
    return withEncoreMrtTrailingSpacer(
      normalizeEncoreMrtColumnOrder(
        ensureEncoreMrtRowActionsInOrder(base.filter((id) => id !== MRT_ROW_SELECT_COL)),
      ),
    );
  }
  const withSelect = base.includes(MRT_ROW_SELECT_COL) ? base : [MRT_ROW_SELECT_COL, ...base];
  const withActions = ensureEncoreMrtRowActionsInOrder(withSelect);
  const normalized = normalizeEncoreMrtColumnOrder(withActions);
  return withEncoreMrtTrailingSpacer(ensureEncoreMrtSelectLeading(normalized));
}

export function perfMrtColumnId(c: MRT_ColumnDef<PerfMrtRow>): string {
  if (c.id) return c.id;
  if (typeof c.accessorKey === 'string') return c.accessorKey;
  if (c.accessorKey != null) return String(c.accessorKey);
  return '';
}

export function formatPerformanceNotesLine(notes: string, maxLen = 72): string {
  const t = notes.trim();
  if (!t) return '';
  const stripped = t.replace(/^Imported:\s*/i, '').trim();
  const base = stripped || t;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

export function normalizePerfVenueLabel(tag: string): string {
  return tag.trim() || 'Venue';
}
