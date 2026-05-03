import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
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
import Typography from '@mui/material/Typography';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactElement,
} from 'react';

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
};

export type EncoreFilterChipBarProps = {
  fields: EncoreFilterFieldConfig[];
  /** Field ids currently shown as chips (includes defaults + user-added). */
  visibleFieldIds: string[];
  /** Selected values per field id (empty array = no filter / “all” for exclusive). */
  values: Record<string, string[]>;
  onChange: (fieldId: string, nextValues: string[]) => void;
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
): string {
  if (!selected.length) return '';
  if (field.exclusive) {
    const opt = field.options.find((o) => o.value === selected[0]);
    return opt?.label ?? selected[0];
  }
  if (selected.length === 1) {
    const opt = field.options.find((o) => o.value === selected[0]);
    return opt?.label ?? selected[0];
  }
  return `${selected.length} selected`;
}

export const EncoreFilterChipBar = forwardRef<EncoreFilterChipBarHandle, EncoreFilterChipBarProps>(
  function EncoreFilterChipBar(props, ref): ReactElement {
    const {
      fields,
      visibleFieldIds,
      values,
      onChange,
      addableFields,
      onVisibleFieldIdsChange,
      defaultPinnedFieldIds = [],
      onClearAll,
      hasActiveFilters,
    } = props;

    const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f] as const)), [fields]);

    const [menu, setMenu] = useState<{ fieldId: string; anchor: HTMLElement } | null>(null);
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);

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
      },
      [onChange, onVisibleFieldIdsChange, visibleFieldIds],
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
            const summary = summarizeField(field, sel);
            const label = summary ? `${field.label}: ${summary}` : field.label;
            return (
              <Chip
                key={fid}
                size="small"
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
                color={sel.length ? 'primary' : 'default'}
                sx={{ fontWeight: 600 }}
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
          {activeField ? (
            <>
              <Box sx={{ px: 1.5, pt: 1.25, pb: 0.75 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {activeField.label}
                </Typography>
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
                          control={<Checkbox size="small" checked={checked} tabIndex={-1} />}
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
                <Button size="small" onClick={() => onChange(activeField.id, [])} sx={{ textTransform: 'none' }}>
                  Clear
                </Button>
              </Box>
            </>
          ) : null}
        </Menu>
      </Stack>
    );
  },
);

EncoreFilterChipBar.displayName = 'EncoreFilterChipBar';
