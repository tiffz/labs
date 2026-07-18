import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Button from '@mui/material/Button';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState, type MouseEvent, type ReactElement } from 'react';

import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';

export type LyreflyPreviewDownloadOption = {
  id: string;
  label: string;
  hint: string;
};

export type LyreflyPreviewDownloadMenuProps = {
  options: readonly LyreflyPreviewDownloadOption[];
  disabled?: boolean;
  busy?: boolean;
  onSelect: (optionId: string) => void;
  /** Accessible name for the trigger button. */
  ariaLabel?: string;
  /** Visual label on the trigger (default: Download). */
  triggerLabel?: string;
};

export function LyreflyPreviewDownloadMenu({
  options,
  disabled = false,
  busy = false,
  onSelect,
  ariaLabel = 'Download',
  triggerLabel = 'Download',
}: LyreflyPreviewDownloadMenuProps): ReactElement {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const { getTriggerA11yProps, getMenuProps } = useLabsDisclosureMenu();

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchor(null);
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<DownloadOutlinedIcon />}
        disabled={disabled || busy}
        onClick={handleOpen}
        aria-label={ariaLabel}
        {...getTriggerA11yProps(open)}
      >
        {busy ? 'Preparing…' : triggerLabel}
      </Button>
      <Menu
        {...getMenuProps()}
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.id}
            onClick={() => {
              handleClose();
              onSelect(option.id);
            }}
          >
            <ListItemText primary={option.label} secondary={option.hint} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
