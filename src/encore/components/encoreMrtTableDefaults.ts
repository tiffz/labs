import type { MRT_RowData, MRT_TableOptions } from 'material-react-table';

/**
 * Shared Material React Table options for Encore list screens (client-side data).
 *
 * IMPORTANT: these are module-level frozen objects, not factory functions, so consumers can spread
 * them into `useMaterialReactTable` without allocating a fresh options tree on every render. The
 * generic on the helper functions only constrains the call site — runtime values are shared.
 */
const CLIENT_LIST_BASE = Object.freeze({
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
    sx: {
      borderRadius: 2,
      width: '100%',
      bgcolor: 'background.paper',
      backgroundImage: 'none',
      border: 'none',
      boxShadow: 'none',
    },
  },
  muiTableContainerProps: {
    sx: { overflow: 'auto', bgcolor: 'background.paper' },
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
      '& .MuiTableSortLabel-root': {
        color: 'inherit',
        fontWeight: 'inherit',
        letterSpacing: 'inherit',
      },
      '& .MuiTableSortLabel-root.Mui-active': {
        color: 'text.primary',
      },
      '& .MuiTableSortLabel-root.Mui-active .MuiTableSortLabel-icon': {
        color: 'text.primary',
      },
    },
  },
  muiTableBodyCellProps: {
    sx: {
      fontSize: '0.875rem',
      color: 'text.primary',
      verticalAlign: 'middle',
      py: 1.25,
      px: 1.5,
      borderBottom: 1,
      borderBottomColor: 'divider',
    },
  },
} as const) as Partial<MRT_TableOptions<MRT_RowData>>;

/**
 * Repertoire / performances tables: many optional columns. Width is driven by column `size` /
 * `minSize` and `tableLayout: 'auto'` so headers are not crushed; horizontal scroll stays inside
 * the table shell (`overflow-x: auto` on the scroll container).
 */
const REPERTOIRE_TABLE = Object.freeze({
  ...CLIENT_LIST_BASE,
  /** Sticky thead + nested scroll forces extra compositing on every wheel tick. */
  enableStickyHeader: false,
  layoutMode: 'grid-no-grow',
  /** Row virtualization: client-side data + heavy cells → keep React work proportional to viewport. */
  enableRowVirtualization: true,
  rowVirtualizerOptions: { overscan: 8 },
  /**
   * Cell-level memoization: the virtualizer re-renders the table body on every wheel tick to
   * update row transforms. Without memoization MRT re-runs every Cell render function for every
   * visible row even though the data is identical, which dominates scroll JS time when cells
   * include heavy primitives (Tooltip, Chip, InlineSongTagsCell, InlineChipSelect, HighlightedText).
   *
   * `memoMode: 'cells'` swaps in MRT's `Memo_MRT_TableBodyCell`, which short-circuits via
   * `prev.cell === next.cell`. During scroll the cell refs are stable so each cell skips re-render.
   *
   * Why not `'rows'`? Row-level memo would also skip the row wrapper, but in Encore some cells
   * grow asynchronously (e.g. `PerformanceVideoThumb` lazy-loads its image after intersection,
   * subtitle lines wrap when the song title resolves). The virtualizer relies on the row wrapper
   * re-rendering to call `measureElement(node)` and pick up the new height; with row-level memo
   * the wrapper is never re-invoked and rows end up positioned at stale Y offsets, producing
   * visible "ghost rows" between fully-rendered rows.
   */
  memoMode: 'cells',
  /** `auto` + `max-content` lets column min widths add up; container scrolls horizontally instead of crushing headers. */
  muiTableProps: {
    sx: { tableLayout: 'auto', width: 'max-content', minWidth: '100%' },
  },
  muiTablePaperProps: {
    ...CLIENT_LIST_BASE.muiTablePaperProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTablePaperProps as { sx?: object } | undefined)?.sx ?? {}),
      maxWidth: '100%',
      minWidth: 0,
      overflow: 'hidden',
    },
  },
  muiTableContainerProps: {
    sx: {
      bgcolor: 'background.paper',
      maxWidth: '100%',
      minWidth: 0,
      overflowX: 'auto',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      WebkitOverflowScrolling: 'touch',
      /** Row virtualization measures from the first scroll container; give it a usable height cap. */
      maxHeight: 'calc(100vh - 220px)',
    },
  },
  muiTableHeadCellProps: {
    ...CLIENT_LIST_BASE.muiTableHeadCellProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTableHeadCellProps as { sx?: object } | undefined)?.sx ?? {}),
      minWidth: 0,
      verticalAlign: 'middle',
      '& .Mui-TableHeadCell-Content': {
        alignItems: 'center',
        width: '100%',
        minWidth: 0,
        minHeight: 40,
      },
      '& .Mui-TableHeadCell-Content-Labels': {
        flex: '1 1 auto',
        minWidth: 0,
        width: '100%',
        alignItems: 'center',
      },
      /** Lets custom `Header` fill space before the sort affordance (MRT defaults to a tiny `minWidth` in `ch`). */
      '& .Mui-TableHeadCell-Content-Wrapper': {
        flex: '1 1 0%',
        minWidth: 0,
        width: 'auto',
        maxWidth: '100%',
      },
      /**
       * Built-in ⋮ column menu is disabled; Encore uses Filter / Hide icon buttons in
       * `EncoreMrtColumnHeader`. Sort arrow: same hover/focus-only visibility as those icons
       * (no always-on arrow on the sorted column). Sorted column is hinted via `data-sort` weight/color.
       * MRT always passes `active` on TableSortLabel, so we key off `data-sort` on the th
       * (set only when the column is sorted) instead of `.Mui-active`.
       */
      '& .Mui-TableHeadCell-Content-Actions .MuiIconButton-root': {
        opacity: '0 !important',
        transition: 'opacity 120ms ease',
      },
      '&:hover .Mui-TableHeadCell-Content-Actions .MuiIconButton-root, &:focus-within .Mui-TableHeadCell-Content-Actions .MuiIconButton-root':
        {
          opacity: '1 !important',
        },
      '& .Mui-TableHeadCell-Content-Labels .MuiTableSortLabel-root': {
        opacity: '0 !important',
        transition: 'opacity 120ms ease',
        flex: '0 0 auto',
      },
      '&:hover .Mui-TableHeadCell-Content-Labels .MuiTableSortLabel-root, &:focus-within .Mui-TableHeadCell-Content-Labels .MuiTableSortLabel-root':
        {
          opacity: '1 !important',
        },
      '&[data-sort]': {
        color: 'text.primary',
      },
      '&[data-sort] .encore-mrt-col-header': {
        fontWeight: 800,
      },
    },
  },
  muiTableBodyCellProps: {
    ...CLIENT_LIST_BASE.muiTableBodyCellProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTableBodyCellProps as { sx?: object } | undefined)?.sx ?? {}),
      minWidth: 0,
      overflow: 'hidden',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    },
  },
} as const) as Partial<MRT_TableOptions<MRT_RowData>>;

export function encoreMrtRepertoireTableOptions<TData extends MRT_RowData>(): Partial<MRT_TableOptions<TData>> {
  return REPERTOIRE_TABLE as Partial<MRT_TableOptions<TData>>;
}

/**
 * Bulk import review grids (scores, performance videos): paging, constrained width
 * so the dialog does not grow a horizontal scrollbar — mirrors repertoire table
 * shell tokens (grid-no-grow, fixed layout, minWidth 0 cells).
 */
const BULK_IMPORT_REVIEW = Object.freeze({
  ...CLIENT_LIST_BASE,
  layoutMode: 'grid-no-grow',
  enablePagination: true,
  enableBottomToolbar: true,
  enableGlobalFilter: false,
  initialState: {
    density: 'compact',
    pagination: { pageIndex: 0, pageSize: 100 },
  },
  muiTableProps: {
    sx: { tableLayout: 'fixed', width: '100%', minWidth: 0 },
  },
  muiTablePaperProps: {
    ...CLIENT_LIST_BASE.muiTablePaperProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTablePaperProps as { sx?: object } | undefined)?.sx ?? {}),
      maxWidth: '100%',
      minWidth: 0,
      overflow: 'hidden',
    },
  },
  muiTableContainerProps: {
    ...CLIENT_LIST_BASE.muiTableContainerProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTableContainerProps as { sx?: object } | undefined)?.sx ?? {}),
      maxWidth: '100%',
      minWidth: 0,
      overflowX: 'hidden',
      overflowY: 'auto',
    },
  },
  muiTableHeadCellProps: {
    ...CLIENT_LIST_BASE.muiTableHeadCellProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTableHeadCellProps as { sx?: object } | undefined)?.sx ?? {}),
      minWidth: 0,
    },
  },
  muiTableBodyCellProps: {
    ...CLIENT_LIST_BASE.muiTableBodyCellProps,
    sx: {
      ...((CLIENT_LIST_BASE.muiTableBodyCellProps as { sx?: object } | undefined)?.sx ?? {}),
      minWidth: 0,
      overflow: 'hidden',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    },
  },
} as const) as Partial<MRT_TableOptions<MRT_RowData>>;

export function encoreMrtBulkImportReviewOptions<TData extends MRT_RowData>(): Partial<MRT_TableOptions<TData>> {
  return BULK_IMPORT_REVIEW as Partial<MRT_TableOptions<TData>>;
}
