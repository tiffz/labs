export interface PlaybackAutoScrollState {
  lastMarker: number | string | null;
  lastScrollAtMs: number;
  lastTargetTop: number | null;
}

export interface PlaybackAutoScrollOptions {
  marker: number | string;
  target: Element;
  state: PlaybackAutoScrollState;
  scrollContainer?: HTMLElement | null;
  minIntervalMs?: number;
  minDeltaPx?: number;
  preferredTopRatio?: number;
  allowBackward?: boolean;
  behavior?: ScrollBehavior;
}

/**
 * Scrolls playback target smoothly with jitter guards:
 * - only when marker changes (for example, line index),
 * - throttled by min interval,
 * - skipped for tiny deltas.
 */
export function scrollPlaybackTarget({
  marker,
  target,
  state,
  scrollContainer,
  minIntervalMs = 240,
  minDeltaPx = 56,
  preferredTopRatio = 0.33,
  allowBackward = true,
  behavior = 'smooth',
}: PlaybackAutoScrollOptions): void {
  if (state.lastMarker !== null && state.lastMarker === marker) return;

  const now = performance.now();
  if (state.lastScrollAtMs > 0 && now - state.lastScrollAtMs < minIntervalMs) return;

  const mainContent =
    scrollContainer ?? (target.closest('.main-content') as HTMLElement | null);

  if (mainContent) {
    const containerRect = mainContent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetYInContainer = targetRect.top - containerRect.top + mainContent.scrollTop;
    const desiredTop = Math.max(0, targetYInContainer - mainContent.clientHeight * preferredTopRatio);
    const currentTop = mainContent.scrollTop;
    const hasPriorAutoScroll = state.lastTargetTop !== null;
    const wouldMoveBackward = desiredTop < currentTop - minDeltaPx;
    if (!allowBackward && hasPriorAutoScroll && wouldMoveBackward) {
      state.lastMarker = marker;
      state.lastScrollAtMs = now;
      return;
    }
    const clampedDesiredTop =
      !allowBackward && state.lastTargetTop !== null
        ? Math.max(desiredTop, state.lastTargetTop)
        : desiredTop;
    if (Math.abs(mainContent.scrollTop - clampedDesiredTop) < minDeltaPx) {
      state.lastMarker = marker;
      state.lastScrollAtMs = now;
      state.lastTargetTop = clampedDesiredTop;
      return;
    }
    mainContent.scrollTo({ top: clampedDesiredTop, behavior });
    state.lastMarker = marker;
    state.lastScrollAtMs = now;
    state.lastTargetTop = clampedDesiredTop;
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const desiredTop = Math.max(0, window.scrollY + targetRect.top - window.innerHeight * preferredTopRatio);
  const currentWindowTop = window.scrollY;
  const hasPriorAutoScroll = state.lastTargetTop !== null;
  const wouldMoveBackward = desiredTop < currentWindowTop - minDeltaPx;
  if (!allowBackward && hasPriorAutoScroll && wouldMoveBackward) {
    state.lastMarker = marker;
    state.lastScrollAtMs = now;
    return;
  }
  const clampedDesiredTop =
    !allowBackward && state.lastTargetTop !== null
      ? Math.max(desiredTop, state.lastTargetTop)
      : desiredTop;
  if (Math.abs(window.scrollY - clampedDesiredTop) < minDeltaPx) {
    state.lastMarker = marker;
    state.lastScrollAtMs = now;
    state.lastTargetTop = clampedDesiredTop;
    return;
  }
  window.scrollTo({ top: clampedDesiredTop, behavior });
  state.lastMarker = marker;
  state.lastScrollAtMs = now;
  state.lastTargetTop = clampedDesiredTop;
}
