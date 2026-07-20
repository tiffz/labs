import { resolveEventTargetElement } from '../../dom/resolveEventTargetElement';

/** Portaled chord-progression preset paper (`AnchoredPopover` + paper class). */
export const CHORD_PROGRESSION_DROPDOWN_CLASS = 'shared-chord-progression-dropdown';

/** Full-screen Popover/Modal root — include in outside-click exemptions. */
export const CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS = 'labs-chord-progression-dropdown-root';

/** True when the event target is inside a portaled chord-progression picker (paper or root). */
export function isChordProgressionPopoverTarget(target: EventTarget | null): boolean {
  const el = resolveEventTargetElement(target);
  return Boolean(
    el?.closest(`.${CHORD_PROGRESSION_DROPDOWN_CLASS}, .${CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS}`),
  );
}

/** Root class for AnchoredPopover `slotProps.root` (always includes shared root + optional host root). */
export function chordProgressionPopoverRootClassName(dropdownClassName?: string): string {
  return [CHORD_PROGRESSION_DROPDOWN_ROOT_CLASS, dropdownClassName ? `${dropdownClassName}-root` : null]
    .filter(Boolean)
    .join(' ');
}
