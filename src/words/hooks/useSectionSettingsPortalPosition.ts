import type { RefObject } from 'react';
import { useEffect, useState } from 'react';
import { getViewportMetrics } from '../utils/appRhythmHelpers';

export type SectionSettingsPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

/** Fixed-position portal placement for section settings menus (tracks gear anchor on scroll). */
export function useSectionSettingsPortalPosition(
  openSectionId: string | null,
  anchorRefs: RefObject<Map<string, HTMLDivElement> | null>,
): SectionSettingsPosition | null {
  const [position, setPosition] = useState<SectionSettingsPosition | null>(null);

  useEffect(() => {
    if (!openSectionId) {
      setPosition(null);
      return;
    }

    let frameId = 0;
    const updatePositionNow = () => {
      const anchor = anchorRefs.current?.get(openSectionId);
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const { width: viewportWidth, height: viewportHeight } = getViewportMetrics();
      const horizontalPadding = 16;
      const viewportPadding = 16;
      const menuGap = 6;
      const preferredMaxHeight = Math.min(viewportHeight * 0.72, 720);
      const menuWidth = Math.min(460, viewportWidth - horizontalPadding * 2);
      const left = Math.min(
        Math.max(horizontalPadding, rect.right - menuWidth),
        viewportWidth - menuWidth - horizontalPadding,
      );
      const spaceBelow = viewportHeight - rect.bottom - viewportPadding - menuGap;
      const spaceAbove = rect.top - viewportPadding - menuGap;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(preferredMaxHeight, openAbove ? spaceAbove : spaceBelow),
      );
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - menuGap - maxHeight)
        : rect.bottom + menuGap;
      setPosition((previous) => {
        if (
          previous &&
          Math.abs(previous.top - top) < 0.5 &&
          Math.abs(previous.left - left) < 0.5 &&
          Math.abs(previous.width - menuWidth) < 0.5 &&
          Math.abs(previous.maxHeight - maxHeight) < 0.5
        ) {
          return previous;
        }
        return { top, left, width: menuWidth, maxHeight };
      });
    };
    const scheduleUpdate = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePositionNow();
      });
    };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    return () => {
      if (frameId !== 0) window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [anchorRefs, openSectionId]);

  return position;
}
