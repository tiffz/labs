import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { encoreAppHref } from '../../routes/encoreAppHash';

export type SongPageChromeProps = {
  isNew: boolean;
  songMenuAnchor: HTMLElement | null;
  onSongMenuAnchorChange: (el: HTMLElement | null) => void;
  onRequestDelete: () => void;
};

export function SongPageChrome(props: SongPageChromeProps): ReactElement {
  const { isNew, songMenuAnchor, onSongMenuAnchorChange, onRequestDelete } = props;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 2.5,
      }}
    >
      <IconButton
        aria-label="Back to library"
        component="a"
        href={encoreAppHref({ kind: 'library' })}
        edge="start"
        size="small"
        sx={{ ml: -0.5 }}
      >
        <ArrowBackIcon />
      </IconButton>
      <Typography
        variant="overline"
        color="primary"
        sx={{ fontWeight: 700, letterSpacing: '0.18em', lineHeight: 1.2 }}
      >
        {isNew ? 'New song' : 'Song'}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }} />
      {!isNew ? (
        <>
          <Tooltip title="More">
            <IconButton
              aria-label="Song actions"
              size="small"
              onClick={(e) => onSongMenuAnchorChange(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={songMenuAnchor}
            open={Boolean(songMenuAnchor)}
            onClose={() => onSongMenuAnchorChange(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              onClick={() => {
                onSongMenuAnchorChange(null);
                onRequestDelete();
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Delete from library</ListItemText>
            </MenuItem>
          </Menu>
        </>
      ) : null}
    </Box>
  );
}
