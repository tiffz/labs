import { resolveEventTargetElement } from '../../dom/resolveEventTargetElement';

/** Portaled drum pattern editor paper (`AnchoredPopover` + `paperClassName`). */
export const DRUM_PATTERN_EDIT_MENU_CLASS = 'drum-pattern-edit-menu';

/** Full-screen Popover/Modal root — include in outside-click exemptions. */
export const DRUM_PATTERN_EDIT_MENU_ROOT_CLASS = 'labs-drum-pattern-edit-menu-root';

/**
 * Body class while the drum pattern editor is open.
 * Hosts (Encore chart) use this to suppress pointer hit-testing behind the menu.
 */
export const DRUM_PATTERN_EDIT_MENU_OPEN_BODY_CLASS = 'labs-drum-pattern-edit-menu-open';

/** Above host floating panels (Encore section playback ~1300, field selects 1500). */
export const DRUM_PATTERN_EDIT_MENU_Z_INDEX = 1600;

/** Dice/hover tips must sit above the portaled edit menu paper. */
export const DRUM_PATTERN_EDIT_TIP_Z_INDEX = DRUM_PATTERN_EDIT_MENU_Z_INDEX + 50;

/** True when the event target is inside the portaled drum pattern edit menu (paper or root). */
export function isDrumPatternEditMenuTarget(target: EventTarget | null): boolean {
  const el = resolveEventTargetElement(target);
  return Boolean(
    el?.closest(`.${DRUM_PATTERN_EDIT_MENU_CLASS}, .${DRUM_PATTERN_EDIT_MENU_ROOT_CLASS}`),
  );
}

/** Freeze popover at the Edit control’s bottom-end corner (placement bottom-end). */
export function drumPatternEditMenuAnchorPosition(
  anchor: HTMLElement,
): { top: number; left: number } {
  const rect = anchor.getBoundingClientRect();
  return { top: rect.bottom, left: rect.right };
}
