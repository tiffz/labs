import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import { SpotifyBrandIcon } from '../components/EncoreBrandIcon';
import { renderSpotifyTrackAutocompleteOption } from './renderSpotifyTrackAutocompleteOption';

function defaultTrackLabel(t: SpotifySearchTrack): string {
  const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
  return `${t.name} — ${artists}`;
}

export type EncoreSpotifySearchOrPasteFieldProps = {
  options: SpotifySearchTrack[];
  loading: boolean;
  inputValue: string;
  onInputChange: (next: string) => void;
  onPickTrack: (track: SpotifySearchTrack) => void;
  onPasteResolve?: () => void | Promise<void>;
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
    placeholder = 'Title, artist, or paste a track URL',
    inputEndAdornment,
    getOptionLabel = defaultTrackLabel,
  } = props;

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
          label={label}
          placeholder={placeholder}
          onBlur={() => void onPasteResolve?.()}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <SpotifyBrandIcon sx={{ mr: 0.75, fontSize: 18, alignSelf: 'center' }} />
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
