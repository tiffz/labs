import type { MRT_RowData, MRT_TableOptions } from 'material-react-table';

/** Shared Material React Table options for Encore list screens (client-side data). */
export function encoreMrtClientListOptions<TData extends MRT_RowData>(): Partial<MRT_TableOptions<TData>> {
  return {
    enableColumnFilters: true,
    enableGlobalFilter: true,
    enableSorting: true,
    enableStickyHeader: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    /** Filters / search live in Encore UI above the table; hide the default icon cluster. */
    enableTopToolbar: false,
    enableToolbarInternalActions: false,
    enableHiding: false,
    enableColumnActions: false,
    enableColumnOrdering: false,
    enableColumnDragging: false,
    enableRowDragging: false,
    enableRowOrdering: false,
    layoutMode: 'semantic',
    muiTablePaperProps: {
      elevation: 0,
      variant: 'outlined',
      sx: {
        borderRadius: 2,
        width: '100%',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
      },
    },
    muiTableContainerProps: {
      sx: { overflow: 'auto', bgcolor: 'background.paper' },
    },
    muiTableHeadCellProps: {
      sx: {
        bgcolor: 'background.paper',
        zIndex: 2,
        fontWeight: 600,
        fontSize: '0.6875rem',
        letterSpacing: '0.03em',
        textTransform: 'none',
        color: 'text.secondary',
        py: 0.85,
        px: 1.25,
        borderBottom: 1,
        borderBottomColor: 'divider',
      },
    },
    muiTableBodyCellProps: {
      sx: { verticalAlign: 'middle', py: 0.75, px: 1.25 },
    },
  };
}
