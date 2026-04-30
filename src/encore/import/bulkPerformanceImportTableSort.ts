export type BulkPerfTableSort = { id: string; desc: boolean };

/** Minimal row shape for client-side sorting (bulk import review table). */
export type BulkPerfSortableRow = {
  id: string;
  driveFileId: string;
  name: string;
  date: string;
  modifiedTime?: string;
};

/** Default: newest calendar dates first (ISO yyyy-mm-dd sorts lexicographically). */
export const BULK_PERF_DEFAULT_SORTING: BulkPerfTableSort[] = [{ id: 'date', desc: true }];

function compareByColumn(a: BulkPerfSortableRow, b: BulkPerfSortableRow, colId: string, desc: boolean): number {
  const dir = desc ? -1 : 1;
  if (colId === 'date') {
    const cmp = (a.date || '').localeCompare(b.date || '', undefined, { numeric: true });
    if (cmp !== 0) return cmp * dir;
  } else if (colId === 'name') {
    const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (cmp !== 0) return cmp * dir;
  } else if (colId === 'modifiedTime') {
    const ta = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
    const tb = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
    if (ta !== tb) return (ta - tb) * dir;
  }
  return 0;
}

/** Client-side sort for bulk import review (keeps row order stable while editing when used with a frozen id list). */
export function sortBulkPerfTableRows<T extends BulkPerfSortableRow>(
  rows: readonly T[],
  sorting: readonly BulkPerfTableSort[],
): T[] {
  if (!sorting.length) return [...rows];
  const { id, desc } = sorting[0]!;
  return [...rows].sort((a, b) => {
    const primary = compareByColumn(a, b, id, desc);
    if (primary !== 0) return primary;
    return a.driveFileId.localeCompare(b.driveFileId);
  });
}
