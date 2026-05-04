import Box from '@mui/material/Box';
import { MaterialReactTable } from 'material-react-table';
import type { MRT_TableInstance } from 'material-react-table';
import type { ReactElement, ReactNode } from 'react';
import { EncoreMrtSearchHighlightContext } from '../encoreMrtSearchHighlightContext';
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

  return (
    <EncoreMrtSearchHighlightContext.Provider value={debouncedSearch}>
      {viewMode === 'table' ? (
        <Box className="encore-mrt-repertoire" sx={{ width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <MaterialReactTable table={table} />
        </Box>
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
      )}
    </EncoreMrtSearchHighlightContext.Provider>
  );
}
