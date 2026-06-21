import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import { useRef, useState, type ReactElement } from 'react';
import BpmInput from '../../shared/components/music/BpmInput';

export type EncoreBpmChipProps = {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  min?: number;
  max?: number;
};

/** Encore tempo chip — MUI Chip shell + shared {@link BpmInput} menu. */
export function EncoreBpmChip({
  value,
  onChange,
  disabled = false,
  size = 'small',
  min = 40,
  max = 200,
}: EncoreBpmChipProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        sx={{ display: 'inline-flex', maxWidth: '100%', minWidth: 0 }}
      >
        <Chip
          size={size}
          clickable
          disabled={disabled}
          label={`${value} BPM`}
          aria-label="Change tempo"
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
        slotProps={{ paper: { sx: { mt: 0.5, p: 1.5, width: 300, maxWidth: '95vw' } } }}
      >
        <BpmInput
          value={value}
          onChange={(next) => onChange(Math.round(next))}
          min={min}
          max={max}
          layout="block"
          showRandomize={false}
          showRateActions={false}
          showPresetDropdown
          dropdownClassName="encore-repertoire-floating-menu encore-originals-bpm-dropdown"
        />
      </Menu>
    </>
  );
}
