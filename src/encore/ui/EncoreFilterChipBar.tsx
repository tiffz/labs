import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DisabledByDefaultRoundedIcon from '@mui/icons-material/DisabledByDefaultRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { encoreExcludeTone } from '../theme/encoreUiTokens';

export type EncoreFilterOption = { value: string; label: string };

export type EncoreFilterFieldConfig = {
  id: string;
  /** Short label on the chip before the colon */
  label: string;
  options: EncoreFilterOption[];
  /** At most one value from options (e.g. performed / status). */
  exclusive?: boolean;
  /** When true, empty `options` still shows the menu (caller may pass options later). */
  allowEmptyOptions?: boolean;
  /**
   * When true, the per-field menu shows an **Include / Exclude** toggle so users can flip the
   * selection from include (OR) to exclude (NOT IN). Only meaningful for multi-select fields:
   * exclusive single-value fields already model is/is-not via their own option list.
   */
  supportsExclude?: boolean;
};

export type EncoreFilterChipBarProps = {
  fields: EncoreFilterFieldConfig[];
  /** Field ids currently shown as chips (includes defaults + user-added). */
  visibleFieldIds: string[];
  /** Selected values per field id (empty array = no filter / “all” for exclusive). */
  values: Record<string, string[]>;
  onChange: (fieldId: string, nextValues: string[]) => void;
  /**
   * Field ids whose selected values are treated as **exclude / NOT IN** instead of
   * include / OR. Only meaningful for fields with {@link EncoreFilterFieldConfig['supportsExclude']}.
   */
  excludedFieldIds?: string[];
  /** Required when any field opts in via `supportsExclude`. */
  onExcludedFieldIdsChange?: (ids: string[]) => void;
  /** Optional extra fields the user can add via “Add filter”. */
  addableFields?: EncoreFilterFieldConfig[];
  onVisibleFieldIdsChange?: (ids: string[]) => void;
  /** Shown chips matching these ids cannot be removed from the bar. */
  defaultPinnedFieldIds?: string[];
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
};

export type EncoreFilterChipBarHandle = {
  /** Opens the same option menu as clicking a filter chip (for column-header entry). */
  openFieldMenu: (fieldId: string, anchorEl: HTMLElement | null) => void;
};

function summarizeField(
  field: EncoreFilterFieldConfig,
  selected: string[],
  excluded: boolean,
): string {
  if (!selected.length) return '';
  if (field.exclusive) {
    const opt = field.options.find((o) => o.value === selected[0]);
    return opt?.label ?? selected[0];
  }
  if (selected.length === 1) {
    const opt = field.options.find((o) => o.value === selected[0]);
    const label = opt?.label ?? selected[0];
    return excluded ? `not ${label}` : label;
  }
  return excluded ? `not ${selected.length} selected` : `${selected.length} selected`;
}

export const EncoreFilterChipBar = forwardRef<EncoreFilterChipBarHandle, EncoreFilterChipBarProps>(
  function EncoreFilterChipBar(props, ref): ReactElement {
    const {
      fields,
      visibleFieldIds,
      values,
      onChange,
      excludedFieldIds,
      onExcludedFieldIdsChange,
      addableFields,
      onVisibleFieldIdsChange,
      defaultPinnedFieldIds = [],
      onClearAll,
      hasActiveFilters,
    } = props;

    const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f] as const)), [fields]);
    const excludedSet = useMemo(() => new Set(excludedFieldIds ?? []), [excludedFieldIds]);

    const [menu, setMenu] = useState<{ fieldId: string; anchor: HTMLElement } | null>(null);
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);

    const setFieldExcluded = useCallback(
      (fieldId: string, exclude: boolean) => {
        if (!onExcludedFieldIdsChange) return;
        const cur = excludedFieldIds ?? [];
        const has = cur.includes(fieldId);
        if (exclude && !has) onExcludedFieldIdsChange([...cur, fieldId]);
        else if (!exclude && has) onExcludedFieldIdsChange(cur.filter((x) => x !== fieldId));
      },
      [excludedFieldIds, onExcludedFieldIdsChange],
    );

    const openMenu = useCallback((fieldId: string, anchor: HTMLElement) => {
      setMenu({ fieldId, anchor });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openFieldMenu: (fieldId, anchorEl) => {
          if (!anchorEl) return;
          if (!fieldById.has(fieldId)) return;
          openMenu(fieldId, anchorEl);
        },
      }),
      [fieldById, openMenu],
    );

    const closeMenu = useCallback(() => {
      setMenu(null);
    }, []);

    const activeField = menu ? fieldById.get(menu.fieldId) : undefined;

    const toggleValue = useCallback(
      (field: EncoreFilterFieldConfig, value: string) => {
        const cur = values[field.id] ?? [];
        if (field.exclusive) {
          const isOn = cur[0] === value;
          onChange(field.id, isOn ? [] : [value]);
          return;
        }
        const set = new Set(cur);
        if (set.has(value)) set.delete(value);
        else set.add(value);
        onChange(field.id, [...set]);
      },
      [onChange, values],
    );

    const addField = useCallback(
      (id: string) => {
        if (!onVisibleFieldIdsChange) return;
        if (visibleFieldIds.includes(id)) {
          setAddMenuAnchor(null);
          return;
        }
        onVisibleFieldIdsChange([...visibleFieldIds, id]);
        setAddMenuAnchor(null);
      },
      [onVisibleFieldIdsChange, visibleFieldIds],
    );

    const removeFieldChip = useCallback(
      (id: string) => {
        if (!onVisibleFieldIdsChange) return;
        onVisibleFieldIdsChange(visibleFieldIds.filter((x) => x !== id));
        onChange(id, []);
        if (onExcludedFieldIdsChange && excludedSet.has(id)) {
          onExcludedFieldIdsChange((excludedFieldIds ?? []).filter((x) => x !== id));
        }
      },
      [excludedFieldIds, excludedSet, onChange, onExcludedFieldIdsChange, onVisibleFieldIdsChange, visibleFieldIds],
    );

    const notYetAdded = useMemo(
      () => (addableFields ?? []).filter((f) => !visibleFieldIds.includes(f.id)),
      [addableFields, visibleFieldIds],
    );

    return (
      <Stack spacing={1.25} alignItems="flex-start">
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" useFlexGap>
          {visibleFieldIds.map((fid) => {
            const field = fieldById.get(fid);
            if (!field) return null;
            const sel = values[fid] ?? [];
            const isExcluded = excludedSet.has(fid) && sel.length > 0 && Boolean(field.supportsExclude);
            const summary = summarizeField(field, sel, isExcluded);
            const label = summary ? `${field.label}: ${summary}` : field.label;
            return (
              <Chip
                key={fid}
                size="small"
                icon={isExcluded ? <BlockIcon sx={{ fontSize: 14 }} /> : undefined}
                label={label}
                onClick={(e) => openMenu(fid, e.currentTarget)}
                onDelete={
                  onVisibleFieldIdsChange && !defaultPinnedFieldIds.includes(fid)
                    ? (e) => {
                        e.stopPropagation();
                        removeFieldChip(fid);
                      }
                    : undefined
                }
                deleteIcon={
                  onVisibleFieldIdsChange && !defaultPinnedFieldIds.includes(fid) ? (
                    <CloseIcon sx={{ fontSize: 16 }} aria-hidden />
                  ) : undefined
                }
                variant={sel.length ? 'filled' : 'outlined'}
                /*
                 * When excluded, opt out of MUI's `color="error"` filled-chip styling — its
                 * default hover swaps the soft pink we set for `error.main` (saturated red),
                 * which makes the chip text unreadable on hover. We render the chip as
                 * `default` and apply the full exclude-tone palette via sx so resting AND
                 * hover both stay in the friendly desaturated key.
                 */
                color={sel.length ? (isExcluded ? 'default' : 'primary') : 'default'}
                sx={(theme) => {
                  if (!isExcluded) return { fontWeight: 600 };
                  const tone = encoreExcludeTone(theme);
                  return {
                    fontWeight: 600,
                    bgcolor: tone.bg,
                    color: tone.fg,
                    border: `1px solid ${tone.border}`,
                    '& .MuiChip-icon': { color: tone.fg },
                    '& .MuiChip-deleteIcon': {
                      color: tone.fg,
                      opacity: 0.55,
                      '&:hover': { color: tone.fg, opacity: 0.95 },
                    },
                    '&:hover, &.MuiChip-clickable:hover': {
                      bgcolor: tone.bgHover,
                      color: tone.fg,
                    },
                    '&:focus-visible': { outlineColor: tone.fg },
                  };
                }}
              />
            );
          })}
          {addableFields && onVisibleFieldIdsChange && notYetAdded.length > 0 ? (
            <>
              <Button
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Add filter
              </Button>
              <Menu
                anchorEl={addMenuAnchor}
                open={Boolean(addMenuAnchor)}
                onClose={() => setAddMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                {notYetAdded.map((f) => (
                  <MenuItem
                    key={f.id}
                    onClick={() => {
                      addField(f.id);
                    }}
                  >
                    <ListItemText primary={f.label} />
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}
          {hasActiveFilters && onClearAll ? (
            <Button size="small" variant="text" onClick={onClearAll} sx={{ fontWeight: 600 }}>
              Clear all filters
            </Button>
          ) : null}
        </Stack>

        <Menu
          anchorEl={menu?.anchor ?? null}
          open={Boolean(menu && activeField)}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                minWidth: 220,
                maxWidth: 'min(100vw - 24px, 360px)',
                maxHeight: 420,
                display: 'flex',
                flexDirection: 'column',
              },
            },
          }}
        >
          {activeField ? (() => {
            const isExcludedMode = excludedSet.has(activeField.id);
            return (
            <>
              <Box sx={{ px: 1.5, pt: 1.25, pb: 0.75 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                    {activeField.label}
                  </Typography>
                  {activeField.supportsExclude && onExcludedFieldIdsChange ? (
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={excludedSet.has(activeField.id) ? 'exclude' : 'include'}
                      onChange={(_e, next: string | null) => {
                        if (next === 'include') setFieldExcluded(activeField.id, false);
                        else if (next === 'exclude') setFieldExcluded(activeField.id, true);
                      }}
                      aria-label={`${activeField.label} include or exclude`}
                      sx={(theme) => {
                        const tone = encoreExcludeTone(theme);
                        return {
                          '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.6875rem',
                            letterSpacing: '0.02em',
                            py: 0.125,
                            px: 1,
                            minHeight: 24,
                            lineHeight: 1.3,
                          },
                          '& .MuiToggleButton-root.Mui-selected[value="exclude"]': {
                            color: tone.fg,
                            backgroundColor: tone.bg,
                            '&:hover': { backgroundColor: tone.bgHover },
                          },
                        };
                      }}
                    >
                      <ToggleButton value="include" aria-label="Include selected">
                        <CheckIcon sx={{ fontSize: 14, mr: 0.375 }} aria-hidden />
                        Include
                      </ToggleButton>
                      <ToggleButton value="exclude" aria-label="Exclude selected">
                        <BlockIcon sx={{ fontSize: 14, mr: 0.375 }} aria-hidden />
                        Exclude
                      </ToggleButton>
                    </ToggleButtonGroup>
                  ) : null}
                </Stack>
              </Box>
              <Divider />
              <Box sx={{ overflowY: 'auto', py: 0.5, flex: 1, minHeight: 0 }}>
                {activeField.options.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
                    No options yet.
                  </Typography>
                ) : (
                  activeField.options.map((opt) => {
                    const sel = values[activeField.id] ?? [];
                    const checked = activeField.exclusive
                      ? sel[0] === opt.value
                      : sel.includes(opt.value);
                    /*
                     * In exclude mode, swap the default checkmark for an X-in-filled-square so
                     * the act of ticking an option immediately *looks* negative. We only swap
                     * the *checked* state — empty squares stay neutral so the row is calm
                     * before the user commits to a value. The icon alone carries the exclude
                     * signal; we deliberately *don't* tint the row background, which would
                     * push the menu from "deliberate negation" into "this is wrong" territory.
                     */
                    const useExcludeCheckbox =
                      isExcludedMode && Boolean(activeField.supportsExclude) && !activeField.exclusive;
                    return (
                      <MenuItem
                        key={opt.value}
                        dense
                        onClick={() => {
                          toggleValue(activeField, opt.value);
                        }}
                        sx={{ py: 0.25 }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              tabIndex={-1}
                              checkedIcon={
                                useExcludeCheckbox ? (
                                  <DisabledByDefaultRoundedIcon fontSize="small" />
                                ) : undefined
                              }
                              sx={
                                useExcludeCheckbox
                                  ? (theme) => ({
                                      '&.Mui-checked': { color: encoreExcludeTone(theme).iconFill },
                                    })
                                  : undefined
                              }
                            />
                          }
                          label={opt.label}
                          sx={{ m: 0, width: 1, pointerEvents: 'none' }}
                        />
                      </MenuItem>
                    );
                  })
                )}
              </Box>
              <Divider />
              <Box sx={{ px: 1, py: 0.75, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  onClick={() => {
                    onChange(activeField.id, []);
                    setFieldExcluded(activeField.id, false);
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Clear
                </Button>
              </Box>
            </>
            );
          })() : null}
        </Menu>
      </Stack>
    );
  },
);

EncoreFilterChipBar.displayName = 'EncoreFilterChipBar';
