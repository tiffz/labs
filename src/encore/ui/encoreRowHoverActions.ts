/**
 * Shared "row-level hover-reveal action" pattern for Encore list / table rows.
 *
 * - On fine-pointer devices (mouse / trackpad), elements with the
 *   {@link ENCORE_ROW_HOVER_TARGET_CLASS} class start invisible and fade in when the row is
 *   hovered or any descendant takes focus (keyboard accessibility).
 * - On coarse pointers (touch), there is no hover state, so the actions stay visible and the
 *   row remains operable from a tap.
 *
 * Apply {@link ENCORE_ROW_HOVER_ACTIONS_SX} to the row's outer container (the element whose
 * `:hover` state controls the reveal) and add `className={ENCORE_ROW_HOVER_TARGET_CLASS}` to
 * each child action that should hide-then-reveal. Used by `LibraryScreen` (repertoire cells)
 * and `PracticeScreen` (per-song row "Stop practicing").
 */

export const ENCORE_ROW_HOVER_TARGET_CLASS = 'encore-row-hover-target';

export const ENCORE_ROW_HOVER_ACTIONS_SX = {
  minWidth: 0,
  '@media (hover: hover) and (pointer: fine)': {
    [`& .${ENCORE_ROW_HOVER_TARGET_CLASS}`]: {
      opacity: 0,
      transition: 'opacity 120ms ease',
    },
    [`&:hover .${ENCORE_ROW_HOVER_TARGET_CLASS}, &:focus-within .${ENCORE_ROW_HOVER_TARGET_CLASS}`]: {
      opacity: 1,
    },
  },
} as const;
