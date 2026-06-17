import Autocomplete, { autocompleteClasses, createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

import { normalizeZineboxTags } from '../utils/zineboxTags';

type ZineboxTagsAutocompleteProps = {
  value: readonly string[];
  suggestions: readonly string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
};

const filter = createFilterOptions<string>({
  trim: true,
  matchFrom: 'any',
  ignoreCase: true,
  limit: 50,
});

export default function ZineboxTagsAutocomplete({
  value,
  suggestions,
  onChange,
  label = 'Tags',
  placeholder = 'Add a tag…',
  helperText,
  disabled = false,
}: ZineboxTagsAutocompleteProps): React.ReactElement {
  const options = useMemo(() => {
    const chosen = new Set(value.map((v) => v.toLowerCase()));
    return suggestions.filter((s) => !chosen.has(s.toLowerCase()));
  }, [suggestions, value]);

  return (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      handleHomeEndKeys
      clearOnBlur
      selectOnFocus
      size="small"
      fullWidth
      disabled={disabled}
      value={value as string[]}
      options={options}
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);
        const trimmed = params.inputValue.trim();
        const exists =
          trimmed.length === 0 ||
          opts.some((o) => o.toLowerCase() === trimmed.toLowerCase()) ||
          value.some((v) => v.toLowerCase() === trimmed.toLowerCase());
        if (!exists) filtered.push(`__create__:${trimmed}`);
        return filtered;
      }}
      getOptionLabel={(opt) => {
        if (typeof opt !== 'string') return '';
        if (opt.startsWith('__create__:')) return opt.slice('__create__:'.length);
        return opt;
      }}
      renderOption={(rprops, opt) => {
        const { key, ...liProps } = rprops as React.HTMLAttributes<HTMLLIElement> & { key?: string };
        if (typeof opt === 'string' && opt.startsWith('__create__:')) {
          const chipLabel = opt.slice('__create__:'.length);
          return (
            <li key={key ?? `create:${chipLabel}`} {...liProps}>
              <Typography variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  Add
                </Box>
                <Chip size="small" label={chipLabel} variant="outlined" />
              </Typography>
            </li>
          );
        }
        return (
          <li key={key ?? String(opt)} {...liProps}>
            <Chip size="small" label={String(opt)} variant="outlined" />
          </li>
        );
      }}
      renderTags={(items, getTagProps) =>
        items.map((tag, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return (
            <Chip
              {...tagProps}
              key={key ?? `${tag}-${index}`}
              size="small"
              label={tag}
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          );
        })
      }
      onChange={(_event, raw) => {
        const cleaned = (raw as string[]).map((v) =>
          v.startsWith('__create__:') ? v.slice('__create__:'.length) : v,
        );
        onChange(normalizeZineboxTags(cleaned));
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label={label}
          placeholder={value.length === 0 ? placeholder : ''}
          helperText={helperText}
        />
      )}
      sx={{
        [`& .${autocompleteClasses.inputRoot}`]: {
          flexWrap: 'wrap',
          gap: 0.5,
        },
      }}
    />
  );
}
