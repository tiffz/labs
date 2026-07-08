import { createContext, useContext } from 'react';
import type { EncoreSong } from '../../types';

/** How long to block chip link/button activation after a drag ends (avoids accidental opens). */
export const PRACTICE_RESOURCE_DRAG_CLICK_SUPPRESS_MS = 500;

/**
 * Post-drop only — never while a drag is active.
 * Mid-drag DOM swaps or pointer-up interception break dnd-kit drop completion.
 */
export function shouldSuppressPracticeResourceChipNavigation(
  blockChipNavigation: boolean,
  dragging: boolean,
): boolean {
  return blockChipNavigation && !dragging;
}

export type PracticeResourceDragState = {
  dragging: boolean;
  activeDragId: string | null;
  song: EncoreSong | null;
  /** True briefly after drop — blocks strip / external link navigation. */
  blockChipNavigation: boolean;
  /** @deprecated Prefer {@link blockChipNavigation}. */
  shouldSuppressChipLinkClick: () => boolean;
};

const defaultState: PracticeResourceDragState = {
  dragging: false,
  activeDragId: null,
  song: null,
  blockChipNavigation: false,
  shouldSuppressChipLinkClick: () => false,
};

export const PracticeResourceDragContext = createContext<PracticeResourceDragState>(defaultState);

export function usePracticeResourceDragState(): PracticeResourceDragState {
  return useContext(PracticeResourceDragContext);
}

/** True while a practice resource chip is being dragged (Encore Listen/Play/Charts/Takes). */
export function usePracticeResourceChipDragging(): boolean {
  return useContext(PracticeResourceDragContext).dragging;
}
