import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactElement } from 'react';

export type LibraryRepertoireBulkBarProps = {
  selectedCount: number;
  bulkOverflowAnchor: HTMLElement | null;
  onBulkOverflowAnchorChange: (el: HTMLElement | null) => void;
  onMarkPracticing: () => void;
  onClearPracticing: () => void;
  onOpenAddTag: () => void;
  onClearSelection: () => void;
  onOpenRefreshSpotify: () => void;
  onOpenBulkDelete: () => void;
};

export function LibraryRepertoireBulkBar(props: LibraryRepertoireBulkBarProps): ReactElement {
  const {
    selectedCount,
    bulkOverflowAnchor,
    onBulkOverflowAnchorChange,
    onMarkPracticing,
    onClearPracticing,
    onOpenAddTag,
    onClearSelection,
    onOpenRefreshSpotify,
    onOpenBulkDelete,
  } = props;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      alignItems={{ sm: 'center' }}
      flexWrap="wrap"
      useFlexGap
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
      }}
    >
      {/*
        Structured bulk-action bar: safe edits sit on the main row, destructive actions live
        in the overflow menu so they aren't a one-click misfire on a toolbar with selected
        rows. Tag input upgrades to an Autocomplete with existing-tag suggestions.
      */}
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {selectedCount} selected
      </Typography>
      <Button size="small" variant="outlined" onClick={onMarkPracticing}>
        Mark currently practicing
      </Button>
      <Button size="small" variant="outlined" onClick={onClearPracticing}>
        Clear practicing
      </Button>
      <Button size="small" variant="outlined" onClick={onOpenAddTag}>
        Add tag…
      </Button>
      <Box sx={{ flex: 1 }} />
      <Button size="small" variant="text" onClick={onClearSelection}>
        Clear selection
      </Button>
      <Tooltip title="More actions">
        <IconButton
          size="small"
          aria-label="More bulk actions"
          aria-haspopup="true"
          aria-expanded={bulkOverflowAnchor ? 'true' : undefined}
          onClick={(e) => onBulkOverflowAnchorChange(e.currentTarget)}
          sx={{
            ml: 0.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 0.5,
            color: 'text.secondary',
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={bulkOverflowAnchor}
        open={Boolean(bulkOverflowAnchor)}
        onClose={() => onBulkOverflowAnchorChange(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            onBulkOverflowAnchorChange(null);
            onOpenRefreshSpotify();
          }}
        >
          Refresh song info from Spotify…
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            onBulkOverflowAnchorChange(null);
            onOpenBulkDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          Remove from library…
        </MenuItem>
      </Menu>
    </Stack>
  );
}
