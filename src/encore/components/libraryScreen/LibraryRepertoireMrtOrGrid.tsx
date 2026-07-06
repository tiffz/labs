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
    <Box
      sx={{
        flex: '1 1 0',
        minHeight: 240,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <EncoreMrtTableShell table={table} searchHighlight={debouncedSearch} sx={{ mt: 0, flex: 1, minHeight: 0 }} />
    </Box>
  ) : (
    <Box
      className="encore-scroll-surface"
      sx={{
        flex: '1 1 0',
        minHeight: 0,
        overflow: 'auto',
        pb: { xs: 2, md: 1 },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
          gap: { xs: 2.25, sm: 2.75 },
        }}
      >
        {grid}
      </Box>
    </Box>
  );
}
