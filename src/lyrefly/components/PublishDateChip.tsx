import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { formatPublishDateDisplay, isoToDateInputValue, parsePublishDateText } from '../utils/publishDateUtils';

export type PublishDateChipProps = {
  isoValue: string;
  ariaLabel?: string;
  disabled?: boolean;
  onCommit: (iso: string) => void;
};

/** Encore-style inline date chip — reads like data until clicked. */
export function PublishDateChip({
  isoValue,
  ariaLabel = 'Published date',
  disabled,
  onCommit,
}: PublishDateChipProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => isoToDateInputValue(isoValue));
  const display = formatPublishDateDisplay(isoValue);

  useEffect(() => {
    setDraft(isoToDateInputValue(isoValue));
  }, [isoValue]);

  const close = (): void => setOpen(false);

  const save = (): void => {
    const parsed = parsePublishDateText(draft);
    if (!parsed) {
      setDraft(isoToDateInputValue(isoValue));
      close();
      return;
    }
    if (parsed !== isoValue) onCommit(parsed);
    close();
  };

  return (
    <>
      <Box ref={anchorRef} sx={{ display: 'inline-flex', maxWidth: '100%', minWidth: 0 }}>
        <Chip
          className="lyrefly-date-chip lyrefly-publish-date-chip"
          size="small"
          clickable={!disabled}
          disabled={disabled}
          label={display}
          aria-label={ariaLabel}
          variant="outlined"
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
        />
      </Box>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.5, p: 1.25, width: 'min(16rem, 88vw)' } } }}
      >
        <Stack spacing={1}>
          <TextField
            size="small"
            label="Published"
            value={draft}
            placeholder="YYYY-MM-DD"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
            slotProps={{
              htmlInput: { inputMode: 'numeric', 'aria-label': 'Published date' },
              inputLabel: { shrink: true }
            }} />
          <Stack direction="row" spacing={1} sx={{
            justifyContent: "flex-end"
          }}>
            <Button size="small" variant="text" onClick={close}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={save}>
              Save
            </Button>
          </Stack>
        </Stack>
      </Menu>
    </>
  );
}
