import type { MRT_RowData, MRT_TableOptions } from 'material-react-table';

/**
 * Material React Table defaults for Lyrefly list screens (client-side data).
 * Mirrors Encore Originals conventions: filters/search live above the table, compact density,
 * no built-in toolbar chrome.
 */
const LYREFLY_CLIENT_LIST_BASE = Object.freeze({
  enableColumnFilters: false,
  enableGlobalFilter: true,
  enableSorting: true,
  enableStickyHeader: true,
  enablePagination: false,
  enableBottomToolbar: false,
  enableDensityToggle: false,
  enableFullScreenToggle: false,
  enableTopToolbar: false,
  enableToolbarInternalActions: false,
  enableHiding: false,
  enableColumnActions: false,
  enableColumnOrdering: false,
  enableColumnDragging: false,
  enableRowDragging: false,
  enableRowOrdering: false,
  enableRowSelection: false,
  layoutMode: 'semantic',
  muiTablePaperProps: {
    elevation: 0,
    className: 'lyrefly-mrt-paper',
    sx: {
      borderRadius: '2px',
      width: '100%',
      bgcolor: 'background.paper',
      backgroundImage: 'none',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: 'none',
    },
  },
  muiTableContainerProps: {
    className: 'lyrefly-mrt-scroll-container',
    sx: {
      overflow: 'auto',
      bgcolor: 'background.paper',
      maxHeight: 'min(70vh, 40rem)',
    },
  },
  muiTableHeadCellProps: {
    sx: {
      bgcolor: 'background.paper',
      zIndex: 2,
      fontSize: '0.6875rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      whiteSpace: 'nowrap',
      py: 1.25,
      px: 1.5,
      borderBottom: 1,
      borderBottomColor: 'divider',
      verticalAlign: 'middle',
    },
  },
  muiTableBodyCellProps: {
    sx: {
      fontSize: '0.875rem',
      color: 'text.primary',
      verticalAlign: 'middle',
      py: 1.1,
      px: 1.5,
      borderBottom: 1,
      borderBottomColor: 'divider',
    },
  },
} as const) as Partial<MRT_TableOptions<MRT_RowData>>;

export function lyreflyMrtShelfTableOptions<TData extends MRT_RowData>(): Partial<MRT_TableOptions<TData>> {
  return LYREFLY_CLIENT_LIST_BASE as Partial<MRT_TableOptions<TData>>;
}

export const LYREFLY_MRT_CLICKABLE_ROW_SX = {
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
} as const;
