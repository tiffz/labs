import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useRef, useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

/**
 * Inline-editable chip primitives. Cells render as a Chip; clicking opens a
 * compact Popover (text/select/date) anchored to the chip. Designed for
 * reuse across the Performances and Repertoire tables.
 */

type InlineChipBaseProps = {
  /** Optional aria-label override; defaults are derived from `placeholder`. */
  ariaLabel?: string;
  size?: 'small' | 'medium';
  /** When set, chip renders in a more visually-prominent state. */
  emphasized?: boolean;
  disabled?: boolean;
};

type InlineChipSelectOption<T extends string> = { value: T; label?: string };

export type InlineChipSelectProps<T extends string> = InlineChipBaseProps & {
  /** Current value; `null`/`''` shows the placeholder. */
  value: T | null | undefined;
  /** Options to choose from. Strings become `{ value, label: value }`. */
  options: ReadonlyArray<T | InlineChipSelectOption<T>>;
  /** Allow free-form text input (e.g. venue tags). */
  freeSolo?: boolean;
  /** Placeholder shown on the chip when empty. */
  placeholder: string;
  /** Whether the user can clear the value (adds a "Clear" affordance). */
  clearable?: boolean;
  onChange: (next: T | null) => void;
  /** Customize the rendered chip label (e.g. truncate, add icon). */
  renderValue?: (value: T) => React.ReactNode;
};

function normalizeOption<T extends string>(o: T | InlineChipSelectOption<T>): InlineChipSelectOption<T> {
  return typeof o === 'string' ? { value: o, label: o } : o;
}

export function InlineChipSelect<T extends string>(props: InlineChipSelectProps<T>): React.ReactElement {
  const {
    value,
    options,
    freeSolo = false,
    placeholder,
    clearable = false,
    onChange,
    renderValue,
    ariaLabel,
    size = 'small',
    emphasized,
    disabled,
  } = props;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const norm = useMemo(() => options.map((o) => normalizeOption<T>(o)), [options]);
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return norm;
    return norm.filter((o) => (o.label ?? o.value).toLowerCase().includes(q));
  }, [norm, filter]);

  const close = useCallback(() => {
    setOpen(false);
    setFilter('');
  }, []);

  const showLabel = value != null && value !== '' ? value : null;
  const display = showLabel != null
    ? renderValue
      ? renderValue(showLabel)
      : norm.find((o) => o.value === showLabel)?.label ?? showLabel
    : placeholder;

  const empty = showLabel == null;

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{ display: 'inline-flex' }}
      >
        <Chip
          size={size}
          clickable
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen(true);
          }}
          label={display}
          aria-label={ariaLabel ?? placeholder}
          variant={empty ? 'outlined' : emphasized ? 'filled' : 'outlined'}
          color={emphasized && !empty ? 'primary' : 'default'}
          disabled={disabled}
          sx={{
            fontWeight: empty ? 500 : 600,
            color: empty ? 'text.secondary' : 'text.primary',
            borderStyle: empty ? 'dashed' : 'solid',
            maxWidth: 240,
          }}
        />
      </Box>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={close}
        slotProps={{ paper: { sx: { mt: 0.5, minWidth: 220, maxWidth: 320, maxHeight: 360 } } }}
      >
        {freeSolo ? (
          <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              value={filter}
              placeholder={placeholder}
              inputRef={(el: HTMLInputElement | null) => {
                if (el && open) {
                  /* Focus once when the menu opens; subsequent renders are a no-op. */
                  if (document.activeElement !== el) el.focus();
                }
              }}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = filter.trim();
                  if (v) {
                    onChange(v as T);
                    close();
                  }
                }
              }}
            />
          </Box>
        ) : null}
        {clearable && !empty ? (
          <MenuItem
            onClick={() => {
              onChange(null);
              close();
            }}
            sx={{ color: 'text.secondary' }}
          >
            Clear
          </MenuItem>
        ) : null}
        {filtered.length === 0 ? (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {freeSolo && filter ? 'Press Enter to use this value.' : 'No matches.'}
            </Typography>
          </Box>
        ) : null}
        {filtered.map((o) => {
          const active = o.value === value;
          return (
            <MenuItem
              key={o.value}
              selected={active}
              onClick={() => {
                onChange(o.value);
                close();
              }}
            >
              {o.label ?? o.value}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export type InlineChipMultiSelectProps<T extends string> = InlineChipBaseProps & {
  values: ReadonlyArray<T>;
  options: ReadonlyArray<T>;
  /** Placeholder shown when no values are picked. */
  placeholder: string;
  onChange: (next: T[]) => void;
};

export function InlineChipMultiSelect<T extends string>(props: InlineChipMultiSelectProps<T>): React.ReactElement {
  const { values, options, placeholder, onChange, ariaLabel, size = 'small', disabled } = props;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const empty = values.length === 0;

  const summary = empty ? placeholder : values.length === 1 ? values[0] : `${values[0]} +${values.length - 1}`;

  const toggle = (tag: T) => {
    const set = new Set<T>(values);
    if (set.has(tag)) set.delete(tag);
    else set.add(tag);
    const ordered = options.filter((o) => set.has(o));
    onChange(ordered);
  };

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{ display: 'inline-flex' }}
      >
        <Chip
          size={size}
          clickable
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen(true);
          }}
          label={summary}
          aria-label={ariaLabel ?? placeholder}
          variant={empty ? 'outlined' : 'outlined'}
          disabled={disabled}
          sx={{
            fontWeight: empty ? 500 : 600,
            color: empty ? 'text.secondary' : 'text.primary',
            borderStyle: empty ? 'dashed' : 'solid',
            maxWidth: 260,
          }}
        />
      </Box>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { mt: 0.5, p: 1.25, minWidth: 240, maxWidth: 320 } } }}
      >
        <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap sx={{ px: 0.5 }}>
          {options.map((o) => {
            const active = values.includes(o);
            return (
              <Chip
                key={o}
                size="small"
                label={o}
                clickable
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                onClick={() => toggle(o)}
              />
            );
          })}
        </Stack>
      </Menu>
    </>
  );
}

export type InlineChipDateProps = InlineChipBaseProps & {
  /** ISO date string (YYYY-MM-DD) or null. */
  value: string | null | undefined;
  placeholder: string;
  onChange: (next: string | null) => void;
};

function formatIsoDateForChip(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = dayjs(iso, 'YYYY-MM-DD', true);
  if (!d.isValid()) return iso;
  return d.format('MMM D, YYYY');
}

export function InlineChipDate(props: InlineChipDateProps): React.ReactElement {
  const { value, placeholder, onChange, ariaLabel, size = 'small', disabled } = props;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const display = formatIsoDateForChip(value) ?? placeholder;
  const empty = !value;

  return (
    <>
      <Box
        ref={anchorRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{ display: 'inline-flex' }}
      >
        <Chip
          size={size}
          clickable
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setOpen(true);
          }}
          label={display}
          aria-label={ariaLabel ?? placeholder}
          variant="outlined"
          disabled={disabled}
          sx={{
            fontWeight: empty ? 500 : 600,
            color: empty ? 'text.secondary' : 'text.primary',
            borderStyle: empty ? 'dashed' : 'solid',
            fontVariantNumeric: 'tabular-nums',
            maxWidth: 200,
          }}
        />
      </Box>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { mt: 0.5, p: 1 } } }}
      >
        <Box sx={{ p: 1 }}>
          <DatePicker
            value={value ? dayjs(value, 'YYYY-MM-DD') : null}
            onChange={(d) => {
              if (d && d.isValid()) {
                onChange(d.format('YYYY-MM-DD'));
              } else {
                onChange(null);
              }
              setOpen(false);
            }}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Box>
      </Menu>
    </>
  );
}
