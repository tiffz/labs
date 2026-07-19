import LinkIcon from '@mui/icons-material/Link';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { looksLikeEncoreMediaUrlInput } from '../repertoire/parseEncoreMediaUrlInput';

/** Neutral link adornment for multi-source paste fields (not Spotify-only). */
// eslint-disable-next-line react-refresh/only-export-components -- shared with Autocomplete renderInput
export function encoreMediaLinkInputStartAdornment(menu = false): ReactElement {
  return (
    <InputAdornment
      position="start"
      sx={menu ? encoreMediaTrackMenuInputAdornmentSx : { ml: 0.5, mr: 0.25, maxHeight: 'none' }}
    >
      <LinkIcon sx={{ fontSize: 18, color: 'text.secondary' }} aria-hidden />
    </InputAdornment>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- shared menu field spacing
export const encoreMediaTrackMenuInputAdornmentSx = {
  ml: 1.25,
  mr: 0.75,
  maxHeight: 'none',
} as const;

// eslint-disable-next-line react-refresh/only-export-components -- shared menu field spacing
export const encoreMediaTrackMenuPasteFieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    pl: 0.75,
  },
  '& .MuiOutlinedInput-input': {
    py: 1,
  },
};

export type EncoreMediaUrlPasteFieldProps = {
  value: string;
  onChange: (next: string) => void;
  /** Called on paste, Enter, or blur when the value looks like a URL. */
  onApply: (raw: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  /** When false, blur only applies for URL-shaped input. Default true. */
  applyOnBlur?: boolean;
  /** Tighter padding when rendered inside the add-track menu. */
  embedInMenu?: boolean;
};

/** Inline URL field for Spotify, YouTube, Stanza, or Drive links — paste to add, no separate button. */
export function EncoreMediaUrlPasteField(props: EncoreMediaUrlPasteFieldProps): ReactElement {
  const {
    value,
    onChange,
    onApply,
    label,
    placeholder = 'Spotify, YouTube, Stanza, or Drive URL',
    helperText,
    disabled,
    applyOnBlur = true,
    embedInMenu = false,
  } = props;

  const tryApply = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    onApply(trimmed);
  };

  return (
    <TextField
      size="small"
      fullWidth
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      helperText={helperText}
      sx={embedInMenu ? encoreMediaTrackMenuPasteFieldSx : undefined}
      {...(label ? { label } : {})}
      onChange={(e) => onChange(e.target.value)}
      onPaste={(e) => {
        const pasted = e.clipboardData.getData('text').trim();
        if (!pasted) return;
        e.preventDefault();
        onChange(pasted);
        queueMicrotask(() => tryApply(pasted));
      }}
      onBlur={() => {
        if (!applyOnBlur) return;
        if (looksLikeEncoreMediaUrlInput(value)) tryApply(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          tryApply(value);
        }
      }}
      slotProps={{
        input: {
          startAdornment: encoreMediaLinkInputStartAdornment(embedInMenu),
        }
      }}
    />
  );
}
