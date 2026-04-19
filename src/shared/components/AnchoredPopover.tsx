import Popover, { type PopoverOrigin, type PopoverProps } from '@mui/material/Popover';
import type { ReactNode } from 'react';

export type AnchoredPopoverPlacement =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'left-start';

const ANCHOR_BY_PLACEMENT: Record<AnchoredPopoverPlacement, PopoverOrigin> = {
  'bottom-start': { vertical: 'bottom', horizontal: 'left' },
  'bottom-end': { vertical: 'bottom', horizontal: 'right' },
  'top-start': { vertical: 'top', horizontal: 'left' },
  'top-end': { vertical: 'top', horizontal: 'right' },
  'right-start': { vertical: 'top', horizontal: 'right' },
  'left-start': { vertical: 'top', horizontal: 'left' },
};

const TRANSFORM_BY_PLACEMENT: Record<AnchoredPopoverPlacement, PopoverOrigin> = {
  'bottom-start': { vertical: 'top', horizontal: 'left' },
  'bottom-end': { vertical: 'top', horizontal: 'right' },
  'top-start': { vertical: 'bottom', horizontal: 'left' },
  'top-end': { vertical: 'bottom', horizontal: 'right' },
  'right-start': { vertical: 'top', horizontal: 'left' },
  'left-start': { vertical: 'top', horizontal: 'right' },
};

export interface AnchoredPopoverProps
  extends Omit<PopoverProps, 'anchorOrigin' | 'transformOrigin' | 'children'> {
  /** How the popover sits relative to its anchor. Defaults to `bottom-start`. */
  placement?: AnchoredPopoverPlacement;
  /** CSS class applied to the popover's Paper element (visual styling). */
  paperClassName?: string;
  children: ReactNode;
}

/**
 * Thin wrapper around MUI `Popover` that bakes in the two most common
 * placement patterns used across apps so each app no longer re-specifies
 * `anchorOrigin` / `transformOrigin` / `slotProps.paper.className`.
 *
 * Adopt this primitive in new code; migrate existing call sites opportunistically.
 * See `src/shared/SHARED_UI_CONVENTIONS.md` for the current adoption status.
 */
export default function AnchoredPopover({
  placement = 'bottom-start',
  paperClassName,
  slotProps,
  children,
  ...rest
}: AnchoredPopoverProps) {
  const mergedSlotProps: PopoverProps['slotProps'] = {
    ...slotProps,
    paper: {
      ...(slotProps?.paper ?? {}),
      ...(paperClassName
        ? { className: paperClassName }
        : {}),
    },
  };
  return (
    <Popover
      {...rest}
      anchorOrigin={ANCHOR_BY_PLACEMENT[placement]}
      transformOrigin={TRANSFORM_BY_PLACEMENT[placement]}
      slotProps={mergedSlotProps}
    >
      {children}
    </Popover>
  );
}
