import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import { useRef, useState, type ReactElement } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import { formatTimeSignatureDisplay } from '../../shared/music/timeSignaturePresets';
import TimeSignatureInput from '../../shared/components/music/TimeSignatureInput';

export type EncoreTimeSignatureChipProps = {
  value: TimeSignature;
  onChange: (next: TimeSignature) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  className?: string;
  dropdownClassName?: string;
};

/** Encore meter chip — MUI Chip shell + shared {@link TimeSignatureInput} menu. */
export function EncoreTimeSignatureChip({
  value,
  onChange,
  disabled = false,
  size = 'small',
  className,
  dropdownClassName = 'encore-repertoire-floating-menu encore-originals-meter-dropdown',
}: EncoreTimeSignatureChipProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        ref={anchorRef}
        className={className}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        sx={{ display: 'inline-flex', maxWidth: '100%', minWidth: 0 }}
      >
        <Chip
          size={size}
          clickable
          disabled={disabled}
          label={formatTimeSignatureDisplay(value)}
          aria-label="Change time signature"
          variant="outlined"
          onClick={() => !disabled && setOpen(true)}
          sx={{
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'text.primary',
            borderStyle: 'solid',
            maxWidth: '100%',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      </Box>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              p: 0,
              overflow: 'visible',
              background: 'transparent',
              boxShadow: 'none',
              border: 0,
            },
          },
        }}
      >
        <TimeSignatureInput
          layout="block"
          value={value}
          dropdownClassName={dropdownClassName}
          onChange={(next) => {
            onChange(next);
          }}
        />
      </Menu>
    </>
  );
}
