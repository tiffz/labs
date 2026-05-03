import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { MRT_Column, MRT_RowData, MRT_TableInstance } from 'material-react-table';
import { useState, type ReactElement } from 'react';

export type EncoreMrtColumnsSettingsButtonProps<TData extends MRT_RowData> = {
  table: MRT_TableInstance<TData>;
  onResetLayout: () => void;
  /** When false, the control is hidden (e.g. grid view). */
  show?: boolean;
};

function columnHeaderText<TData extends MRT_RowData>(column: MRT_Column<TData, unknown>): string {
  const h = column.columnDef.header;
  if (typeof h === 'string' && h.trim()) return h;
  return column.id;
}

export function EncoreMrtColumnsSettingsButton<TData extends MRT_RowData>(
  props: EncoreMrtColumnsSettingsButtonProps<TData>,
): ReactElement {
  const { table, onResetLayout, show = true } = props;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  /** Keeps sibling controls (e.g. view mode toggle) from shifting when this hides in grid view. */
  if (!show) {
    return <Box aria-hidden sx={{ width: 34, height: 34, flexShrink: 0 }} />;
  }

  const hideableColumns = table
    .getAllLeafColumns()
    .filter((col) => col.columnDef.enableHiding !== false && col.getCanHide());

  return (
    <>
      <Tooltip title="Columns & layout">
        <IconButton
          size="small"
          aria-label="Columns and layout"
          aria-haspopup="dialog"
          aria-expanded={anchor ? 'true' : 'false'}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ flexShrink: 0 }}
        >
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280, maxWidth: 'min(320px, 92vw)', p: 1.5 } } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Visible columns
        </Typography>
        <Stack
          spacing={0.25}
          sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}
          aria-label="Toggle column visibility"
        >
          {hideableColumns.map((col) => (
            <FormControlLabel
              key={col.id}
              sx={{ mx: 0, alignItems: 'flex-start' }}
              control={
                <Checkbox
                  size="small"
                  checked={col.getIsVisible()}
                  onChange={(_, checked) => {
                    col.toggleVisibility(checked);
                  }}
                  inputProps={{ 'aria-label': `Show ${columnHeaderText(col)} column` }}
                />
              }
              label={
                <Typography variant="body2" sx={{ pt: 0.5 }}>
                  {columnHeaderText(col)}
                </Typography>
              }
            />
          ))}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RestartAltIcon fontSize="small" />}
            onClick={() => {
              onResetLayout();
              setAnchor(null);
            }}
            sx={{ textTransform: 'none' }}
          >
            Reset columns
          </Button>
        </Box>
      </Popover>
    </>
  );
}
