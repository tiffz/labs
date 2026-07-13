import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import type { ReactElement } from 'react';

import type { ComicArtVersion, ComicProject } from '../types';
import type { ArtVersionPickerValue } from '../utils/artVersionUtils';

export type LyreflyArtVersionPickerProps = {
  project: ComicProject;
  artVersions: readonly ComicArtVersion[];
  value: ArtVersionPickerValue;
  onChange: (value: ArtVersionPickerValue) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
};

export function LyreflyArtVersionPicker({
  project,
  artVersions,
  value,
  onChange,
  disabled,
  className,
  compact = false,
}: LyreflyArtVersionPickerProps): ReactElement | null {
  if (artVersions.length === 0) return null;

  const onSelect = (event: SelectChangeEvent): void => {
    onChange(event.target.value as ArtVersionPickerValue);
  };

  return (
    <FormControl
      size="small"
      className={className}
      sx={
        compact
          ? { minWidth: '9.5rem', maxWidth: '12rem', flexShrink: 0 }
          : { minWidth: 'min(14rem, 100%)' }
      }
    >
      {compact ? null : <InputLabel id="lyrefly-art-version-picker-label">Art version</InputLabel>}
      <Select
        labelId={compact ? undefined : 'lyrefly-art-version-picker-label'}
        label={compact ? undefined : 'Art version'}
        displayEmpty={compact}
        value={value}
        disabled={disabled}
        onChange={onSelect}
        data-testid="lyrefly-art-version-picker"
        renderValue={
          compact
            ? (selected) => {
                if (selected === 'current') return 'Latest';
                const version = artVersions.find((entry) => entry.id === selected);
                if (!version) return 'Version';
                return project.finalArtVersionId === version.id ? `${version.label} (final)` : version.label;
              }
            : undefined
        }
      >
        <MenuItem value="current">Latest page picks</MenuItem>
        {artVersions.map((version) => (
          <MenuItem key={version.id} value={version.id}>
            {version.label}
            {project.finalArtVersionId === version.id ? ' (final)' : ''}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
