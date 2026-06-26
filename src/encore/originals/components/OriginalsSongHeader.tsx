import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useState, type ReactElement } from 'react';
import { encoreAppHref, handleSpaLinkClick, navigateEncore } from '../../routes/encoreAppHash';
import { encorePageSectionGap } from '../../theme/encoreM3Layout';
import { encoreHairline, encoreRadius } from '../../theme/encoreUiTokens';
import type { EncoreOriginalSong, OriginalSongSnapshot } from '../types';

export type OriginalsPageMode = 'write' | 'view';

export type OriginalsSongHeaderProps = {
  song: EncoreOriginalSong;
  mode: OriginalsPageMode;
  onModeChange: (mode: OriginalsPageMode) => void;
  onChange: (patch: Partial<EncoreOriginalSong>) => void;
  /** Tighter spacing when the header lives inside the chords scroll column. */
  compact?: boolean;
  onRestoreSnapshot: (snap: OriginalSongSnapshot) => void;
  onDelete: () => void;
};

export function OriginalsSongHeader({
  song,
  mode,
  onModeChange,
  onChange,
  compact = false,
  onRestoreSnapshot,
  onDelete,
}: OriginalsSongHeaderProps): ReactElement {
  const theme = useTheme();
  const [historyAnchor, setHistoryAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const historyNewestFirst = [...song.history].reverse();

  return (
    <Stack spacing={0} className="encore-originals-no-print" sx={{ mb: compact ? 0 : encorePageSectionGap }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} useFlexGap>
        <Tooltip title="Back to originals">
          <IconButton
            component="a"
            href={encoreAppHref({ kind: 'originals' })}
            aria-label="Back to originals"
            size="small"
            sx={{ mt: 0.5, ml: -0.5 }}
            onClick={(e) => handleSpaLinkClick(e, () => navigateEncore({ kind: 'originals' }))}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 700, letterSpacing: '0.14em', lineHeight: 1.2, display: 'block' }}
          >
            Original
          </Typography>
          <TextField
            value={song.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Untitled original"
            variant="standard"
            fullWidth
            InputProps={{ disableUnderline: true }}
            inputProps={{
              'aria-label': 'Song title',
              style: {
                fontSize: '1.375rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                padding: 0,
              },
            }}
            sx={{
              mt: 0.5,
              '& .MuiInput-root': { fontSize: 'inherit' },
            }}
          />
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0, pt: 0.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, next: OriginalsPageMode | null) => {
              if (next) onModeChange(next);
            }}
            aria-label="Original page mode"
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              borderRadius: encoreRadius,
              border: 1,
              borderColor: encoreHairline,
              '& .MuiToggleButton-root': {
                border: 0,
                px: 1.5,
                py: 0.75,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: 'text.secondary',
                gap: 0.75,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              },
            }}
          >
            <ToggleButton value="write" aria-label="Write mode">
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
              Write
            </ToggleButton>
            <ToggleButton value="view" aria-label="View mode">
              <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
              View
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Chart history">
            <IconButton size="small" aria-label="Chart history" onClick={(e) => setHistoryAnchor(e.currentTarget)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="More actions">
            <IconButton size="small" aria-label="More actions" onClick={(e) => setMoreAnchor(e.currentTarget)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Menu anchorEl={historyAnchor} open={Boolean(historyAnchor)} onClose={() => setHistoryAnchor(null)}>
        {historyNewestFirst.length === 0 ? (
          <MenuItem disabled>No snapshots yet</MenuItem>
        ) : (
          historyNewestFirst.map((snap) => (
            <MenuItem
              key={snap.timestamp}
              onClick={() => {
                onRestoreSnapshot(snap);
                setHistoryAnchor(null);
              }}
            >
              {new Date(snap.timestamp).toLocaleString()}
            </MenuItem>
          ))
        )}
      </Menu>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMoreAnchor(null);
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          Delete original
        </MenuItem>
      </Menu>
    </Stack>
  );
}
