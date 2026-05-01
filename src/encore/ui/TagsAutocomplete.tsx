import Autocomplete, { autocompleteClasses, createFilterOptions } from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useMemo } from 'react';
import { normalizeSongTags } from '../repertoire/songTags';

/**
 * Free-text multi-tag editor.
 *
 * Modern conventions: MUI Autocomplete with `freeSolo + multiple` so users
 * type to filter existing tags from the suggestion list, press Enter (or comma)
 * to commit a new one, and remove tags with the chip "delete" affordance.
 */
export interface TagsAutocompleteProps {
  /** Current tags on the song. */
  value: readonly string[];
  /** All tags ever used across the user's library — used as suggestions. */
  suggestions: readonly string[];
  onChange: (next: string[]) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  /** Render compact (no label, single row) for inline-edit contexts. */
  dense?: boolean;
  /**
   * When true, committed tags are not shown as chips inside the input.
   * Use when the parent already lists every tag (e.g. inline chip row + popover editor).
   */
  omitInputChips?: boolean;
}

const filter = createFilterOptions<string>({
  trim: true,
  matchFrom: 'any',
  ignoreCase: true,
  /* Limit suggestions so the popper stays manageable on big libraries. */
  limit: 50,
});

export function TagsAutocomplete(props: TagsAutocompleteProps): React.ReactElement {
  const {
    value,
    suggestions,
    onChange,
    label = 'Tags',
    placeholder = 'Add a tag…',
    helperText,
    size = 'small',
    fullWidth = true,
    dense = false,
    omitInputChips = false,
  } = props;

  const options = useMemo(() => {
    /* Surface every saved tag, but exclude ones already chosen so the
       popper doesn't show duplicates. */
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
      size={size}
      fullWidth={fullWidth}
      value={value as string[]}
      options={options}
      filterOptions={(opts, params) => {
        const filtered = filter(opts, params);
        const trimmed = params.inputValue.trim();
        const exists =
          trimmed.length === 0 ||
          opts.some((o) => o.toLowerCase() === trimmed.toLowerCase()) ||
          value.some((v) => v.toLowerCase() === trimmed.toLowerCase());
        if (!exists) {
          /* Inline "create new" affordance — modern multi-tag UX. */
          filtered.push(`__create__:${trimmed}`);
        }
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
          const label = opt.slice('__create__:'.length);
          return (
            <li key={key ?? `create:${label}`} {...liProps}>
              <Typography variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  Add
                </Box>
                <Chip size="small" label={label} variant="outlined" />
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
      renderTags={
        omitInputChips
          ? () => null
          : (items, getTagProps) =>
              items.map((tag, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    {...tagProps}
                    key={key ?? `${tag}-${index}`}
                    size={size}
                    label={tag}
                    variant="filled"
                    sx={{ fontWeight: 600 }}
                  />
                );
              })
      }
      onChange={(_event, raw) => {
        const cleaned = (raw as string[]).map((v) =>
          v.startsWith('__create__:') ? v.slice('__create__:'.length) : v
        );
        onChange(normalizeSongTags(cleaned));
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label={dense ? undefined : label}
          placeholder={value.length === 0 ? placeholder : ''}
          helperText={helperText}
          inputProps={{
            ...params.inputProps,
            'aria-label': dense ? label : undefined,
          }}
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
