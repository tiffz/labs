import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Shared head/body cell typography for every Encore data table — keeps MRT's
 * Repertoire table, the Performances list, and the import review grids in the
 * same visual rhythm (one header style, one cell rhythm, one divider tone).
 */
const encoreTableHeadCellSx = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  bgcolor: 'background.paper',
  borderBottom: 1,
  borderColor: 'divider',
  whiteSpace: 'nowrap' as const,
  zIndex: 2,
};

const encoreTableBodyCellSx = {
  fontSize: '0.875rem',
  color: 'text.primary',
  borderColor: 'divider',
  minWidth: 0,
  overflow: 'hidden',
  wordBreak: 'break-word' as const,
  overflowWrap: 'anywhere' as const,
};

/**
 * Shared `Table` `sx` for Encore import review grids (playlist import, bulk imports).
 * Compact row rhythm and middle vertical alignment; sticky header uses an opaque paper background.
 */
export const encoreImportReviewTableSx: SxProps<Theme> = {
  tableLayout: 'fixed',
  width: '100%',
  minWidth: 0,
  '& .MuiTableCell-root': {
    ...encoreTableBodyCellSx,
    px: 1.5,
    py: 1,
    verticalAlign: 'middle',
    fontSize: '0.8125rem',
  },
  '& .MuiTableCell-head': {
    ...encoreTableHeadCellSx,
    py: 1,
    fontSize: '0.65rem',
  },
};

