import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { KeyInputPicker } from '../../shared/components/music/KeyInputPicker';
import { formatSongKeyButtonLabel, formatSongKeyDisplay, parseSongKey } from '../../shared/music/songKeyFormat';

export type EncoreKeyChipProps = {
  value?: string;
  placeholder: string;
  onChange: (next: string) => void;
  clearable?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  /** Full key label, compact toolbar label (`D maj`), or root only (`Db`). */
  displayMode?: 'full' | 'compact' | 'root';
  modeFormat?: 'short' | 'long';
  className?: string;
  dropdownClassName?: string;
};

/** Encore repertoire/originals key chip — MUI Chip shell + shared {@link KeyInputPicker} menu. */
export function EncoreKeyChip({
  value,
  placeholder,
  onChange,
  clearable = false,
  disabled = false,
  size = 'small',
  displayMode = 'full',
  modeFormat = 'long',
  className,
  dropdownClassName = 'encore-repertoire-floating-menu encore-repertoire-key-dropdown',
}: EncoreKeyChipProps): ReactElement {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const hasValue = Boolean(value?.trim());

  const label = useMemo(() => {
    if (!hasValue) return placeholder;
    if (displayMode === 'root') return parseSongKey(value!).root;
    if (displayMode === 'compact') return formatSongKeyButtonLabel(value!);
    return formatSongKeyDisplay(value!);
  }, [displayMode, hasValue, placeholder, value]);

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
          label={label}
          aria-label={hasValue ? 'Change key' : placeholder}
          variant="outlined"
          onClick={() => !disabled && setOpen(true)}
          sx={{
            fontWeight: hasValue ? 600 : 500,
            color: hasValue ? 'text.primary' : 'text.secondary',
            borderStyle: hasValue ? 'solid' : 'dashed',
            maxWidth: '100%',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      </Box>
      <KeyInputPicker
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        value={value}
        onChange={(next) => {
          onChange(next);
          setOpen(false);
        }}
        showMode
        modeFormat={modeFormat}
        clearable={clearable}
        dropdownClassName={dropdownClassName}
      />
    </>
  );
}
