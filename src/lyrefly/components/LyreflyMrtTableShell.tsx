import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { MaterialReactTable, type MRT_RowData, type MRT_TableInstance } from 'material-react-table';
import type { ReactElement } from 'react';

export type LyreflyMrtTableShellProps<TData extends MRT_RowData> = {
  table: MRT_TableInstance<TData>;
  className?: string;
  sx?: SxProps<Theme>;
};

/** Shared Material React Table shell for Lyrefly list screens. */
export function LyreflyMrtTableShell<TData extends MRT_RowData>({
  table,
  className = 'lyrefly-mrt-shelf',
  sx,
}: LyreflyMrtTableShellProps<TData>): ReactElement {
  return (
    <Box
      className={className}
      data-testid="lyrefly-shelf-table"
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        mt: 0,
        ...sx,
      }}
    >
      <MaterialReactTable table={table} />
    </Box>
  );
}
