import type { PopoverProps } from '@mui/material/Popover';
import type { SystemStyleObject } from '@mui/system';

/** MUI Paper chrome — must match `.labs-popover-surface` in labsChrome.css */
export const LABS_POPOVER_CHROME_SX: SystemStyleObject = {
  boxShadow: 'var(--labs-popover-shadow)',
  backgroundColor: 'var(--labs-popover-bg)',
  border: 'var(--labs-popover-border)',
  borderRadius: 'var(--labs-popover-radius)',
  backdropFilter: 'var(--labs-popover-backdrop)',
  backgroundImage: 'none',
};

type PaperSlot = NonNullable<PopoverProps['slotProps']>['paper'];

export function mergeAnchoredPopoverPaperSlot(
  paperSlot: PaperSlot | undefined,
  mergedClassName: string,
): PaperSlot {
  const paperObj = paperSlot && typeof paperSlot === 'object' ? paperSlot : {};
  const existingSx = paperObj.sx;
  const sx = existingSx
    ? Array.isArray(existingSx)
      ? [...existingSx, LABS_POPOVER_CHROME_SX]
      : [existingSx, LABS_POPOVER_CHROME_SX]
    : LABS_POPOVER_CHROME_SX;

  return {
    ...paperObj,
    elevation: 0,
    className: mergedClassName,
    sx,
  };
}
