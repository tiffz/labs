import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { memo, useMemo, type ReactElement } from 'react';
import { HighlightedText } from '../../ui/HighlightedText';
import {
  originalsDashboardRailGroupLabelSx,
  originalsDashboardRailItemSx,
  originalsDashboardRailPaperSx,
} from '../originalsDashboardUi';
import { buildOriginalSongDashboardStatus } from '../originalsSongDashboardStatus';
import type { EncoreOriginalSong } from '../types';

export type OriginalsSongDashboardRailProps = {
  rows: EncoreOriginalSong[];
  search: string;
  focusedSongId: string;
  onFocusSong: (songId: string) => void;
};

function RailSongRow({
  song,
  search,
  selected,
  onFocusSong,
}: {
  song: EncoreOriginalSong;
  search: string;
  selected: boolean;
  onFocusSong: (songId: string) => void;
}): ReactElement {
  const status = buildOriginalSongDashboardStatus(song);
  const title = song.title.trim() || 'Untitled';
  const secondary = status.demoReady
    ? 'Demo ready'
    : status.stageProgress
      ? `${status.stageLabel} · ${status.stageProgress}`
      : status.stageLabel;

  return (
    <ListItem disablePadding dense>
      <ListItemButton
        selected={selected}
        onClick={() => onFocusSong(song.id)}
        sx={originalsDashboardRailItemSx(selected)}
      >
        <ListItemText
          primary={
            <HighlightedText
              text={title}
              highlight={search}
              component="span"
              variant="body2"
              sx={{ fontWeight: 700, lineHeight: 1.35 }}
            />
          }
          secondary={secondary}
          primaryTypographyProps={{ component: 'div', noWrap: true }}
          secondaryTypographyProps={{
            variant: 'caption',
            noWrap: true,
            sx: {
              fontSize: '0.75rem',
              lineHeight: 1.35,
              color: status.demoReady ? 'success.main' : 'text.secondary',
            },
          }}
          sx={{ my: 0 }}
        />
      </ListItemButton>
    </ListItem>
  );
}

export const OriginalsSongDashboardRail = memo(function OriginalsSongDashboardRail({
  rows,
  search,
  focusedSongId,
  onFocusSong,
}: OriginalsSongDashboardRailProps): ReactElement {
  const theme = useTheme();
  const { pendingRows, demoReadyRows } = useMemo(() => {
    const pending: EncoreOriginalSong[] = [];
    const demoReady: EncoreOriginalSong[] = [];
    for (const song of rows) {
      if (buildOriginalSongDashboardStatus(song).demoReady) demoReady.push(song);
      else pending.push(song);
    }
    return { pendingRows: pending, demoReadyRows: demoReady };
  }, [rows]);

  return (
    <Paper component="aside" elevation={0} sx={originalsDashboardRailPaperSx(theme)}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1}>
        <Typography variant="caption" sx={originalsDashboardRailGroupLabelSx()}>
          Drafts ({pendingRows.length})
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
          {rows.length} total
        </Typography>
      </Stack>
      <Stack component="nav" aria-label="Original songs" spacing={0.5} sx={{ mt: 1 }}>
        {pendingRows.map((song) => (
          <RailSongRow
            key={song.id}
            song={song}
            search={search}
            selected={song.id === focusedSongId}
            onFocusSong={onFocusSong}
          />
        ))}
        {demoReadyRows.length > 0 ? (
          <>
            {pendingRows.length > 0 ? (
              <Divider sx={{ my: 0.75, borderColor: 'divider' }} />
            ) : null}
            <Typography variant="caption" sx={{ ...originalsDashboardRailGroupLabelSx(), pt: pendingRows.length > 0 ? 0.25 : 0 }}>
              Demo ready ({demoReadyRows.length})
            </Typography>
            {demoReadyRows.map((song) => (
              <RailSongRow
                key={song.id}
                song={song}
                search={search}
                selected={song.id === focusedSongId}
                onFocusSong={onFocusSong}
              />
            ))}
          </>
        ) : null}
      </Stack>
    </Paper>
  );
});
