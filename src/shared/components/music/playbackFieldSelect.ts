import type { PopoverProps } from '@mui/material/Popover';
import type { SystemStyleObject } from '@mui/system';
import type { WheelEvent as ReactWheelEvent } from 'react';
import { LABS_POPOVER_CHROME_SX } from '../anchoredPopoverChrome';

/** Shared closed-trigger + menu shell appearance for playback pickers (sound, chord style, …). */
export type PlaybackFieldSelectAppearance =
  | 'default'
  | 'encore'
  | 'words'
  | 'chords'
  | 'piano';

/** Menu paper variant — app skins get their own list chrome; generic hosts use default. */
export type PlaybackFieldSelectMenuAppearance =
  | 'default'
  | 'encore'
  | 'words'
  | 'chords'
  | 'piano';

export function resolvePlaybackFieldSelectMenuAppearance(
  appearance: PlaybackFieldSelectAppearance,
): PlaybackFieldSelectMenuAppearance {
  if (
    appearance === 'encore' ||
    appearance === 'words' ||
    appearance === 'chords' ||
    appearance === 'piano'
  ) {
    return appearance;
  }
  return 'default';
}

/** Class on the portaled Popover root — hosts must treat clicks inside as in-panel. */
export const PLAYBACK_FIELD_SELECT_POPOVER_CLASS = 'shared-playback-field-select-popover';

/** True when `target` is inside a portaled playback field select menu (sound, style, …). */
export function isPlaybackFieldSelectPopoverTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(`.${PLAYBACK_FIELD_SELECT_POPOVER_CLASS}`));
}

/** Above floating panels (e.g. Encore playback settings) so nested menus paint on top. */
export const PLAYBACK_FIELD_SELECT_Z_INDEX = 1500;

/** Words section-style menus use 2600; nested sound pickers must sit above them. */
export const PLAYBACK_FIELD_SELECT_WORDS_Z_INDEX = 2700;

export function playbackFieldSelectRootClass(
  appearance: PlaybackFieldSelectAppearance = 'default',
  extra?: string,
): string {
  return ['shared-playback-field-select', `shared-playback-field-select--${appearance}`, extra]
    .filter(Boolean)
    .join(' ');
}

export function playbackFieldSelectMenuClass(
  appearance: PlaybackFieldSelectAppearance = 'default',
  extra?: string,
): string {
  const menuAppearance = resolvePlaybackFieldSelectMenuAppearance(appearance);
  return [
    'shared-playback-field-select__menu',
    `shared-playback-field-select__menu--${menuAppearance}`,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Map richer host appearance tokens (e.g. ChordStyleInput skins) onto the shared trigger API. */
export function resolvePlaybackFieldSelectAppearance(
  appearance: string,
): PlaybackFieldSelectAppearance {
  if (
    appearance === 'encore' ||
    appearance === 'words' ||
    appearance === 'chords' ||
    appearance === 'piano'
  ) {
    return appearance;
  }
  return 'default';
}

/** Forward wheel events on an invisible backdrop to the page scroll container. */
export function forwardWheelToPageScroller(event: ReactWheelEvent<HTMLElement>): void {
  const scroller = document.querySelector('.in-scroll-region');
  if (!(scroller instanceof HTMLElement)) return;
  scroller.scrollTop += event.deltaY;
  scroller.scrollLeft += event.deltaX;
  event.preventDefault();
}

function popoverBackdropSlotProps(): NonNullable<PopoverProps['slotProps']>['backdrop'] {
  return {
    sx: { backgroundColor: 'transparent' },
    onWheel: forwardWheelToPageScroller,
  };
}

export function playbackFieldSelectPopoverSlotProps(
  appearance: PlaybackFieldSelectAppearance = 'default',
  opts?: {
    menuClassName?: string;
    rootClassName?: string;
    minWidth?: number | string;
    maxWidth?: number | string;
    zIndex?: number;
  },
): PopoverProps['slotProps'] {
  return {
    root: {
      className: [PLAYBACK_FIELD_SELECT_POPOVER_CLASS, opts?.rootClassName]
        .filter(Boolean)
        .join(' '),
      sx: { zIndex: opts?.zIndex ?? PLAYBACK_FIELD_SELECT_Z_INDEX },
    },
    backdrop: popoverBackdropSlotProps(),
    paper: {
      className: playbackFieldSelectMenuClass(appearance, opts?.menuClassName),
      sx: {
        minWidth: opts?.minWidth,
        maxWidth: opts?.maxWidth,
      },
    },
  };
}

/** Floating settings / tool panels that may host nested playback field selects. */
export function playbackFloatingPanelSlotProps(opts?: {
  paperClassName?: string;
  paperSx?: SystemStyleObject;
}): PopoverProps['slotProps'] {
  const paperSx = opts?.paperSx
    ? Array.isArray(opts.paperSx)
      ? [...opts.paperSx, LABS_POPOVER_CHROME_SX]
      : [opts.paperSx, LABS_POPOVER_CHROME_SX]
    : LABS_POPOVER_CHROME_SX;

  return {
    backdrop: popoverBackdropSlotProps(),
    paper: {
      elevation: 0,
      className: ['labs-popover-surface', opts?.paperClassName].filter(Boolean).join(' '),
      sx: paperSx,
    },
  };
}
