import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import type { ReactNode, ClipboardEvent } from 'react';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import { looksLikeEncoreMediaUrlInput } from '../repertoire/parseEncoreMediaUrlInput';
import { renderSpotifyTrackAutocompleteOption } from './renderSpotifyTrackAutocompleteOption';
import { encoreBrandInputStartAdornment } from './EncoreBrandTextField';

function defaultTrackLabel(t: SpotifySearchTrack): string {
  const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
  return `${t.name} · ${artists}`;
}

export type EncoreSpotifySearchOrPasteFieldProps = {
  options: SpotifySearchTrack[];
  loading: boolean;
  inputValue: string;
  onInputChange: (next: string) => void;
  onPickTrack: (track: SpotifySearchTrack) => void;
  onPasteResolve?: (raw?: string) => void | Promise<void>;
  label: string;
  placeholder?: string;
  /** Prepended before the loading spinner in the field end adornment (e.g. open / refresh). */
  inputEndAdornment?: ReactNode;
  getOptionLabel?: (t: SpotifySearchTrack) => string;
};

export function EncoreSpotifySearchOrPasteField(props: EncoreSpotifySearchOrPasteFieldProps) {
  const {
    options,
    loading,
    inputValue,
    onInputChange,
    onPickTrack,
    onPasteResolve,
    label,
    placeholder = 'Paste URL or search title and artist',
    inputEndAdornment,
    getOptionLabel = defaultTrackLabel,
  } = props;

  const resolvePaste = (raw?: string) => {
    void onPasteResolve?.(raw);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted) return;
    e.preventDefault();
    onInputChange(pasted);
    queueMicrotask(() => resolvePaste(pasted));
  };

  return (
    <Autocomplete
      fullWidth
      size="small"
      options={options}
      loading={loading}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      value={null}
      inputValue={inputValue}
      onInputChange={(_, v) => onInputChange(v)}
      onChange={(_, v) => {
        if (v && typeof v === 'object' && 'id' in v) onPickTrack(v as SpotifySearchTrack);
      }}
      filterOptions={(x) => x}
      renderOption={(p, t) => renderSpotifyTrackAutocompleteOption(p, t)}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          size="small"
          {...(label ? { label } : {})}
          placeholder={placeholder}
          onPaste={onPaste}
          onBlur={() => {
            if (looksLikeEncoreMediaUrlInput(inputValue)) resolvePaste(inputValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && looksLikeEncoreMediaUrlInput(inputValue)) {
              e.preventDefault();
              resolvePaste(inputValue);
            }
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {encoreBrandInputStartAdornment('spotify', { iconPx: 18 })}
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {inputEndAdornment}
                {loading ? <CircularProgress color="inherit" size={16} sx={{ mr: 0.5 }} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
