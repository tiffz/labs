import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import { useDeferredValue, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_RowSelectionState,
  type MRT_SortingState,
  type MRT_TableInstance,
  type MRT_TableOptions,
} from 'material-react-table';
import { EncoreMrtSearchHighlightContext } from '../encoreMrtSearchHighlightContext';
import { encoreMrtRepertoireTableOptions } from '../encoreMrtTableDefaults';
import { MRT_ROW_SELECT_COL, MRT_ROW_SPACER_COL } from '../encoreMrtColumnOrder';
import type { PerfMrtRow } from '../performancesScreenHelpers';
import { getPerfRowId } from '../performancesScreenHelpers';

type PerfTableOptions = MRT_TableOptions<PerfMrtRow>;

export type PerformancesMrtTableViewProps = {
  columns: MRT_ColumnDef<PerfMrtRow>[];
  data: PerfMrtRow[];
  searchHighlight: string;
  rowSelection: MRT_RowSelectionState;
  onRowSelectionChange: Dispatch<SetStateAction<MRT_RowSelectionState>>;
  columnVisibility: Record<string, boolean>;
  columnOrder: string[];
  sorting: MRT_SortingState;
  onColumnVisibilityChange: NonNullable<PerfTableOptions['onColumnVisibilityChange']>;
  onColumnOrderChange: NonNullable<PerfTableOptions['onColumnOrderChange']>;
  onSortingChange: NonNullable<PerfTableOptions['onSortingChange']>;
  mrtTheme: { baseBackgroundColor: string };
  bodyRowSx: Record<string, unknown>;
  onEditPerformance: (perf: PerfMrtRow['perf']) => void;
  onTableReady?: (table: MRT_TableInstance<PerfMrtRow>) => void;
};

/** MRT table isolated so the hook does not run in grid view or while the tab is hidden. */
export function PerformancesMrtTableView({
  columns,
  data,
  searchHighlight,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  columnOrder,
  sorting,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onSortingChange,
  mrtTheme,
  bodyRowSx,
  onEditPerformance,
  onTableReady,
}: PerformancesMrtTableViewProps): React.ReactElement {
  const deferredColumns = useDeferredValue(columns);
  const deferredData = useDeferredValue(data);

  const perfMrtBaseOptions = encoreMrtRepertoireTableOptions<PerfMrtRow>();
  const displayColumnDefOptions = useMemo(
    () =>
      ({
        [MRT_ROW_SELECT_COL]: {
          enableColumnOrdering: false,
          size: 44,
          minSize: 40,
          maxSize: 56,
          muiTableHeadCellProps: { sx: { px: 1, py: 1.25, verticalAlign: 'middle' } },
          muiTableBodyCellProps: { sx: { px: 1, py: 1.25, verticalAlign: 'middle' } },
        },
        [MRT_ROW_SPACER_COL]: { enableColumnOrdering: false },
        'mrt-row-actions': {
          header: '',
          size: 48,
          minSize: 44,
          maxSize: 56,
          enableHiding: false,
          enableColumnActions: false,
          muiTableHeadCellProps: { sx: { textAlign: 'right' } },
          muiTableBodyCellProps: { sx: { textAlign: 'right' } },
        },
      }) as const,
    [],
  );

  const table = useMaterialReactTable<PerfMrtRow>(
    useMemo(
      () => ({
        columns: deferredColumns,
        data: deferredData,
        getRowId: getPerfRowId,
        ...perfMrtBaseOptions,
        enableColumnFilters: false,
        enableHiding: true,
        enableColumnActions: false,
        enableColumnOrdering: true,
        displayColumnDefOptions,
        enableRowActions: true,
        positionActionsColumn: 'last',
        renderRowActions: ({ row }: { row: MRT_Row<PerfMrtRow> }) => (
          <IconButton size="small" aria-label="Edit performance" onClick={() => onEditPerformance(row.original.perf)}>
            <EditIcon fontSize="small" />
          </IconButton>
        ),
        enableRowSelection: true,
        onRowSelectionChange,
        state: {
          rowSelection,
          columnVisibility,
          columnOrder,
          sorting,
        },
        onColumnVisibilityChange,
        onColumnOrderChange,
        onSortingChange,
        mrtTheme,
        muiTableBodyRowProps: { sx: bodyRowSx },
        initialState: { density: 'compact' as const },
      }),
      [
        deferredColumns,
        deferredData,
        perfMrtBaseOptions,
        displayColumnDefOptions,
        onRowSelectionChange,
        rowSelection,
        columnVisibility,
        columnOrder,
        sorting,
        onColumnVisibilityChange,
        onColumnOrderChange,
        onSortingChange,
        mrtTheme,
        bodyRowSx,
        onEditPerformance,
      ],
    ),
  );

  useEffect(() => {
    onTableReady?.(table);
  }, [onTableReady, table]);

  return (
    <Box sx={{ mt: 2 }}>
      <EncoreMrtSearchHighlightContext.Provider value={searchHighlight}>
        <MaterialReactTable table={table} />
      </EncoreMrtSearchHighlightContext.Provider>
    </Box>
  );
}
