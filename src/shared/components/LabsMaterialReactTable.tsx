import { MaterialReactTable, type MRT_RowData, type MRT_TableInstance } from 'material-react-table';
import { useLayoutEffect, useReducer, type ReactElement } from 'react';

/**
 * `<MaterialReactTable>` that survives being unmounted and mounted again with the same `table`.
 * Render every MRT table through this; `mrtRemountGuardrails.test.ts` enforces it.
 *
 * The bug it fixes (material-react-table 3.2.1): MRT keeps its scroll container in
 * `table.refs.tableContainerRef` and only ever SETS it, never clears it. When the table unmounts
 * (Encore's library flips to cards) and mounts again, the row virtualizer's layout effect runs
 * before React attaches the new container, so it binds to the old, detached one, measures a height
 * of 0, and draws no rows. Nothing re-renders to correct it. The table looked empty until reload.
 *
 * Dev hides it: StrictMode runs every layout effect a second time, after the ref is attached. Only
 * a production build shows the empty table, so a dev-server e2e cannot see this bug.
 *
 * The fix: drop the stale node on unmount, and re-render once after mount, when the new container
 * is attached, so the virtualizers bind to it before the browser paints.
 */
export function LabsMaterialReactTable<TData extends MRT_RowData>({
  table,
}: {
  table: MRT_TableInstance<TData>;
}): ReactElement {
  const [, rebind] = useReducer((n: number) => n + 1, 0);

  // `table` is stable for the life of the screen (TanStack keeps one instance), so this runs once
  // per mount, not per render.
  useLayoutEffect(() => {
    rebind();
    return () => {
      table.refs.tableContainerRef.current = null;
    };
  }, [table]);

  return <MaterialReactTable table={table} />;
}
