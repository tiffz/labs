import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useState, type MouseEvent, type ReactElement } from 'react';
import {
  ENCORE_DATE_RANGE_PRESETS,
  encoreDateRangeFromPreset,
  isEncoreDateRangeActive,
  type EncoreDateRangeFilterValue,
  type EncoreDateRangePresetId,
} from '../utils/encoreDateRangeFilter';

export type EncoreDateRangeFilterMenuProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  value: EncoreDateRangeFilterValue;
  onChange: (next: EncoreDateRangeFilterValue) => void;
};

/** Preset + custom calendar menu shared by filter chip bar and standalone date chips. */
export function EncoreDateRangeFilterMenu({
  anchorEl,
  open,
  onClose,
  value,
  onChange,
}: EncoreDateRangeFilterMenuProps): ReactElement {
  const [customAfter, setCustomAfter] = useState<Dayjs | null>(null);
  const [customBefore, setCustomBefore] = useState<Dayjs | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!open) return;
    const active = isEncoreDateRangeActive(value);
    setCustomAfter(value.after ? dayjs(value.after, 'YYYY-MM-DD') : null);
    setCustomBefore(value.before ? dayjs(value.before, 'YYYY-MM-DD') : null);
    setShowCustom(active && !matchesKnownPreset(value));
  }, [open, value]);

  const close = useCallback(() => {
    onClose();
    setShowCustom(false);
  }, [onClose]);

  const applyPreset = useCallback(
    (presetId: EncoreDateRangePresetId) => {
      if (presetId === 'custom') {
        setShowCustom(true);
        return;
      }
      onChange(encoreDateRangeFromPreset(presetId));
      close();
    },
    [close, onChange],
  );

  const applyCustom = useCallback(() => {
    onChange({
      after: customAfter?.isValid() ? customAfter.format('YYYY-MM-DD') : undefined,
      before: customBefore?.isValid() ? customBefore.format('YYYY-MM-DD') : undefined,
    });
    close();
  }, [close, customAfter, customBefore, onChange]);

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={close} slotProps={{ paper: { sx: { minWidth: 240 } } }}>
      {ENCORE_DATE_RANGE_PRESETS.map((preset) => (
        <MenuItem key={preset.id} onClick={() => applyPreset(preset.id)}>
          {preset.label}
        </MenuItem>
      ))}
      {showCustom ? (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }} onClick={(e: MouseEvent) => e.stopPropagation()}>
            <Stack spacing={1.25}>
              <DatePicker
                label="On or after"
                value={customAfter}
                onChange={setCustomAfter}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="On or before"
                value={customBefore}
                onChange={setCustomBefore}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={applyCustom}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                Apply range
              </Button>
            </Stack>
          </Box>
        </>
      ) : null}
    </Menu>
  );
}

function matchesKnownPreset(value: EncoreDateRangeFilterValue): boolean {
  if (!isEncoreDateRangeActive(value)) return true;
  return ENCORE_DATE_RANGE_PRESETS.some((preset) => {
    if (preset.id === 'any' || preset.id === 'custom') return false;
    const presetRange = encoreDateRangeFromPreset(preset.id);
    return presetRange.after === value.after && presetRange.before === value.before;
  });
}
