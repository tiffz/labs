import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared `Table` `sx` for Encore import review grids (playlist import, bulk performance import).
 * Sticky header cells use an opaque paper background so body rows do not show through when scrolling.
 */
export const encoreImportReviewTableSx: SxProps<Theme> = {
  tableLayout: 'fixed',
  width: '100%',
  minWidth: 0,
  '& .MuiTableCell-root': {
    px: 2,
    py: 1.5,
    verticalAlign: 'top',
    borderColor: 'divider',
  },
  '& .MuiTableCell-head': {
    py: 1.5,
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    bgcolor: 'background.paper',
    borderBottom: 1,
    borderColor: 'divider',
    zIndex: 2,
  },
};

/**
 * Performances index table: avoid `table-layout: fixed` so the Video column (thumb + actions)
 * cannot squeeze Date / Song cells and cause visual overlap on narrower widths.
 */
export const encorePerformancesTableSx: SxProps<Theme> = {
  width: '100%',
  minWidth: 0,
  tableLayout: 'auto',
  '& .MuiTableCell-root': {
    px: 2,
    py: 1.25,
    verticalAlign: 'middle',
    borderColor: 'divider',
  },
  '& .MuiTableCell-head': {
    py: 1.25,
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    bgcolor: 'background.paper',
    borderBottom: 1,
    borderColor: 'divider',
    zIndex: 2,
  },
};
