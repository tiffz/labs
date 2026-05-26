import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { MaterialReactTable, type MRT_RowData, type MRT_TableInstance } from 'material-react-table';
import type { ReactElement } from 'react';
import { EncoreMrtSearchHighlightContext } from './encoreMrtSearchHighlightContext';

/** Stable row sx for clickable Encore list tables (repertoire, performances, originals). */
export const ENCORE_MRT_CLICKABLE_ROW_SX = {
  cursor: 'pointer',
  '&:hover': { bgcolor: 'action.hover' },
} as const;

export type EncoreMrtTableShellProps<TData extends MRT_RowData> = {
  table: MRT_TableInstance<TData>;
  /** Passed to {@link EncoreMrtSearchHighlightContext} for title/snippet highlighting. */
  searchHighlight?: string;
  /** Defaults to `encore-mrt-repertoire` (shared MRT chrome in encore.css). */
  className?: string;
  sx?: SxProps<Theme>;
};

/**
 * Shared Material React Table shell for Encore list screens — search highlight context,
 * width containment, and repertoire table class hooks.
 */
export function EncoreMrtTableShell<TData extends MRT_RowData>({
  table,
  searchHighlight = '',
  className = 'encore-mrt-repertoire',
  sx,
}: EncoreMrtTableShellProps<TData>): ReactElement {
  return (
    <EncoreMrtSearchHighlightContext.Provider value={searchHighlight}>
      <Box
        className={className}
        sx={{
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          mt: 2,
          ...sx,
        }}
      >
        <MaterialReactTable table={table} />
      </Box>
    </EncoreMrtSearchHighlightContext.Provider>
  );
}
