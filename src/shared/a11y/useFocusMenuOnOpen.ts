import { useEffect } from 'react';
import type { RefObject } from 'react';
import { focusFirstFocusable } from './focusable';

/** Move focus into a menu/panel when it opens (after paint). */
export function useFocusMenuOnOpen(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      focusFirstFocusable(containerRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, containerRef]);
}
