import Box from '@mui/material/Box';
import type { MRT_TableInstance } from 'material-react-table';
import type { ReactElement, ReactNode } from 'react';
import { EncoreMrtTableShell } from '../EncoreMrtTableShell';
import type { EncoreRepertoireMrtRow } from './libraryRepertoireMrtRowTypes';
import type { RepertoireViewMode } from '../libraryScreenHelpers';

export type LibraryRepertoireMrtOrGridProps = {
  debouncedSearch: string;
  viewMode: RepertoireViewMode;
  table: MRT_TableInstance<EncoreRepertoireMrtRow>;
  grid: ReactNode;
};

export function LibraryRepertoireMrtOrGrid(props: LibraryRepertoireMrtOrGridProps): ReactElement {
  const { debouncedSearch, viewMode, table, grid } = props;

  return viewMode === 'table' ? (
    <EncoreMrtTableShell table={table} searchHighlight={debouncedSearch} />
  ) : (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
        gap: { xs: 2.25, sm: 2.75 },
      }}
    >
      {grid}
    </Box>
  );
}
