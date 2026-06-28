import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { resolveEventTargetElement } from '../../shared/dom/resolveEventTargetElement';
import { classifyHorizontalSwipe, isTapGesture } from './readerGestures';

/** How long chrome stays up after the last interaction before auto-hiding (coarse pointers only). */
const AUTO_HIDE_MS = 3000;

/** Controls inside the content area whose taps must not be treated as a chrome toggle / swipe. */
const INTERACTIVE_SELECTOR = 'button, a, [role="button"], input, .MuiToggleButtonGroup-root';

export interface ReaderImmersiveOptions {
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  /** Swipe navigation is only meaningful in paged modes (single / spread), not vertical scroll. */
  swipeEnabled: boolean;
}

export interface ReaderImmersive {
  /** True only on touch / coarse pointers while chrome is currently hidden. */
  immersiveHidden: boolean;
  /** Force chrome visible (e.g. when the page changes) and restart the auto-hide timer. */
  reveal: () => void;
  /** Spread onto the paged content container(s). */
  contentPointerHandlers: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerUp: (event: ReactPointerEvent) => void;
  };
}

/**
 * Touch reader behavior: swipe to turn pages and tap to toggle auto-hiding chrome — without
 * degrading desktop. Mouse pointers are ignored entirely (no swipe, no tap-toggle), and auto-hide
 * only runs on coarse pointers, so a desktop reader keeps its persistent header + arrows + keyboard
 * navigation exactly as before. Arrows stay reachable on touch (revealed with the chrome), which is
 * the WCAG 2.5.1 single-tap alternative to the swipe gesture.
 */
export function useReaderImmersive({
  onSwipePrev,
  onSwipeNext,
  swipeEnabled,
}: ReaderImmersiveOptions): ReaderImmersive {
  const [coarse, setCoarse] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const hideTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // Mirror live values into refs so the pointer handlers can stay referentially stable.
  const coarseRef = useRef(coarse);
  coarseRef.current = coarse;
  const cbRef = useRef({ onSwipePrev, onSwipeNext, swipeEnabled });
  cbRef.current = { onSwipePrev, onSwipeNext, swipeEnabled };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const clearTimer = useCallback(() => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const reveal = useCallback(() => {
    setChromeVisible(true);
  }, []);

  // Auto-hide lifecycle. Desktop (fine pointer) always keeps chrome visible.
  useEffect(() => {
    if (!coarse) {
      clearTimer();
      setChromeVisible(true);
      return;
    }
    if (!chromeVisible) {
      clearTimer();
      return;
    }
    clearTimer();
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), AUTO_HIDE_MS);
    return clearTimer;
  }, [coarse, chromeVisible, clearTimer]);

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse') {
      pressStart.current = null;
      return;
    }
    const el = resolveEventTargetElement(event.target);
    if (el?.closest(INTERACTIVE_SELECTOR)) {
      pressStart.current = null;
      return;
    }
    pressStart.current = { x: event.clientX, y: event.clientY, t: event.timeStamp };
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent) => {
    const start = pressStart.current;
    pressStart.current = null;
    if (!start || event.pointerType === 'mouse') return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const dt = event.timeStamp - start.t;

    const { onSwipePrev: prev, onSwipeNext: next, swipeEnabled: canSwipe } = cbRef.current;
    if (canSwipe) {
      const swipe = classifyHorizontalSwipe(dx, dy);
      if (swipe) {
        if (swipe === 'next') next();
        else prev();
        return;
      }
    }

    // Tap on empty page area toggles chrome (coarse pointers only).
    if (coarseRef.current && isTapGesture(dx, dy, dt)) {
      setChromeVisible((visible) => !visible);
    }
  }, []);

  return {
    immersiveHidden: coarse && !chromeVisible,
    reveal,
    contentPointerHandlers: { onPointerDown, onPointerUp },
  };
}
