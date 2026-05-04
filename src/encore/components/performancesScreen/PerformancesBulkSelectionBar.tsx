import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactElement } from 'react';

export type PerformancesBulkSelectionBarProps = {
  selectedCount: number;
  bulkOverflowAnchor: HTMLElement | null;
  onBulkOverflowAnchorChange: (el: HTMLElement | null) => void;
  onClearRowSelection: () => void;
  onOpenBulkVenue: () => void;
  onOpenBulkAccompaniment: () => void;
  onOpenBulkDelete: () => void;
};

export function PerformancesBulkSelectionBar(props: PerformancesBulkSelectionBarProps): ReactElement {
  const {
    selectedCount,
    bulkOverflowAnchor,
    onBulkOverflowAnchorChange,
    onClearRowSelection,
    onOpenBulkVenue,
    onOpenBulkAccompaniment,
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
        mt: 2,
        mb: 1,
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
      }}
    >
      {/*
        Structured bulk-action bar mirroring LibraryScreen: edit affordances grouped on the
        left (Set venue, Set accompaniment), destructive Delete tucked into an overflow menu
        so it isn't a one-misclick action when many rows are selected.
      */}
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {selectedCount} selected
      </Typography>
      <Button size="small" variant="outlined" onClick={onOpenBulkVenue}>
        Set venue…
      </Button>
      <Button size="small" variant="outlined" onClick={onOpenBulkAccompaniment}>
        Set accompaniment…
      </Button>
      <Box sx={{ flex: 1 }} />
      <Button size="small" variant="text" onClick={onClearRowSelection}>
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
            onOpenBulkDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          Delete…
        </MenuItem>
      </Menu>
    </Stack>
  );
}
