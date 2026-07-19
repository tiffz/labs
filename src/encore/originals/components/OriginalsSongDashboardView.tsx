import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { encorePageSectionGap } from '../../theme/encoreM3Layout';
import type { EncoreOriginalSong } from '../types';
import { sortOriginalsForDashboardQueue } from '../originalsSongDashboardSort';
import { OriginalsSongDashboardPanel } from './OriginalsSongDashboardPanel';
import { OriginalsSongDashboardRail } from './OriginalsSongDashboardRail';

export type OriginalsSongDashboardViewProps = {
  rows: EncoreOriginalSong[];
  search: string;
  listActive: boolean;
  onSaveSong: (song: EncoreOriginalSong) => void;
};

/** Practice-style master–detail: compact song rail (left) + dense detail panel (right). */
export function OriginalsSongDashboardView({
  rows,
  search,
  listActive,
  onSaveSong,
}: OriginalsSongDashboardViewProps): ReactElement {
  const [focusedSongId, setFocusedSongId] = useState<string | null>(null);

  const sortedRows = useMemo(() => sortOriginalsForDashboardQueue(rows), [rows]);

  useEffect(() => {
    if (sortedRows.length === 0) {
      setFocusedSongId(null);
      return;
    }
    if (!focusedSongId || !sortedRows.some((s) => s.id === focusedSongId)) {
      setFocusedSongId(sortedRows[0]!.id);
    }
  }, [focusedSongId, sortedRows]);

  const focusedSong = useMemo(
    () => sortedRows.find((s) => s.id === focusedSongId) ?? null,
    [focusedSongId, sortedRows],
  );

  const onFocusSong = useCallback((songId: string) => {
    setFocusedSongId(songId);
  }, []);

  if (!focusedSong) {
    return (
      <Paper
        elevation={0}
        data-testid="originals-song-dashboard-empty"
        sx={{
          py: 4,
          px: 3,
          textAlign: 'center',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          No songs match your search.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box
      data-testid="originals-song-dashboard"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 30%) minmax(0, 1fr)' },
        gap: encorePageSectionGap,
        alignItems: 'flex-start',
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <OriginalsSongDashboardRail
          rows={sortedRows}
          search={search}
          focusedSongId={focusedSong.id}
          onFocusSong={onFocusSong}
        />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <OriginalsSongDashboardPanel song={focusedSong} listActive={listActive} onSaveSong={onSaveSong} />
      </Box>
    </Box>
  );
}
