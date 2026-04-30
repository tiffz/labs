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

/**
 * Repertoire library table: constrain width so the semantic table + many columns
 * do not force a page-level horizontal scrollbar (overflow stays inside the table shell).
 */
export function encoreMrtRepertoireTableOptions<TData extends MRT_RowData>(): Partial<MRT_TableOptions<TData>> {
  const base = encoreMrtClientListOptions<TData>();
  const paperSx = (base.muiTablePaperProps as { sx?: object } | undefined)?.sx;
  const containerSx = (base.muiTableContainerProps as { sx?: object } | undefined)?.sx;
  const headSx = (base.muiTableHeadCellProps as { sx?: object } | undefined)?.sx;
  const bodySx = (base.muiTableBodyCellProps as { sx?: object } | undefined)?.sx;
  return {
    ...base,
    layoutMode: 'grid-no-grow',
    muiTableProps: {
      sx: { tableLayout: 'fixed', width: '100%' },
    },
    muiTablePaperProps: {
      ...base.muiTablePaperProps,
      sx: {
        ...(typeof paperSx === 'object' && paperSx !== null ? paperSx : {}),
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
      },
    },
    muiTableContainerProps: {
      ...base.muiTableContainerProps,
      sx: {
        ...(typeof containerSx === 'object' && containerSx !== null ? containerSx : {}),
        maxWidth: '100%',
        minWidth: 0,
      },
    },
    muiTableHeadCellProps: {
      ...base.muiTableHeadCellProps,
      sx: {
        ...(typeof headSx === 'object' && headSx !== null ? headSx : {}),
        minWidth: 0,
      },
    },
    muiTableBodyCellProps: {
      ...base.muiTableBodyCellProps,
      sx: {
        ...(typeof bodySx === 'object' && bodySx !== null ? bodySx : {}),
        minWidth: 0,
      },
    },
  };
}

/** Bulk performance import review: many rows, paging; search lives in Encore UI above the table. */
export function encoreMrtBulkImportReviewOptions<TData extends MRT_RowData>(): Partial<MRT_TableOptions<TData>> {
  return {
    ...encoreMrtClientListOptions<TData>(),
    enablePagination: true,
    enableBottomToolbar: true,
    enableGlobalFilter: false,
    initialState: {
      density: 'compact',
      pagination: { pageIndex: 0, pageSize: 100 },
    },
  };
}
