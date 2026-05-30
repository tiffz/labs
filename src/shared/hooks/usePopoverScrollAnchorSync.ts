import type { PopoverActions } from '@mui/material/Popover';
import { useEffect, type RefObject } from 'react';

function isScrollableOverflow(value: string): boolean {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

/** Scrollable ancestors of the anchor — includes Labs `.in-scroll-region` when present. */
export function collectPopoverScrollParents(anchor: HTMLElement | null): HTMLElement[] {
  const parents: HTMLElement[] = [];
  let el = anchor?.parentElement ?? null;
  while (el) {
    const style = getComputedStyle(el);
    if (isScrollableOverflow(style.overflowY) || isScrollableOverflow(style.overflowX)) {
      parents.push(el);
    }
    el = el.parentElement;
  }

  const inScrollRegion = document.querySelector('.in-scroll-region');
  if (inScrollRegion instanceof HTMLElement && !parents.includes(inScrollRegion)) {
    parents.push(inScrollRegion);
  }

  return parents;
}

/**
 * Keeps MUI `Popover` anchored while nested scroll containers move (e.g. Encore
 * `.in-scroll-region`). MUI only listens to `window` scroll when `disableScrollLock`
 * is set; this fills the gap for in-app scroll regions.
 */
export function usePopoverScrollAnchorSync(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  actionRef: RefObject<PopoverActions | null>,
): void {
  useEffect(() => {
    if (!open) return undefined;

    const update = () => {
      actionRef.current?.updatePosition();
    };

    const scrollParents = collectPopoverScrollParents(anchorRef.current);
    window.addEventListener('scroll', update, { passive: true, capture: true });
    for (const parent of scrollParents) {
      parent.addEventListener('scroll', update, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      for (const parent of scrollParents) {
        parent.removeEventListener('scroll', update);
      }
    };
  }, [open, anchorRef, actionRef]);
}

/** Prefer a getter so MUI reads a fresh rect on each reposition. */
export function popoverAnchorEl(
  anchorRef: RefObject<HTMLElement | null>,
): () => HTMLElement | null {
  return () => anchorRef.current;
}
