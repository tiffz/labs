const LONG_TASK_MS = 50;

/** Dev-only scroll/long-task monitor — enable with `?gesturePerf` on /gesture/. */
export function mountGestureCollectionsScrollPerf(): () => void {
  if (!import.meta.env.DEV) return () => {};
  if (typeof window === 'undefined') return () => {};
  if (!new URLSearchParams(window.location.search).has('gesturePerf')) return () => {};

  const disposers: Array<() => void> = [];

  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= LONG_TASK_MS) {
            console.warn(
              `[gesture-perf] long task ${entry.duration.toFixed(1)}ms`,
              entry.name || 'unknown',
            );
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      disposers.push(() => longTaskObserver.disconnect());
    } catch {
      /* longtask unsupported */
    }
  }

  let rafId = 0;
  let frameBudgetStart = performance.now();
  let slowFrameCount = 0;

  const onScroll = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      const now = performance.now();
      const frameMs = now - frameBudgetStart;
      frameBudgetStart = now;
      if (frameMs > 32) {
        slowFrameCount += 1;
        if (slowFrameCount % 8 === 1) {
          console.warn(`[gesture-perf] scroll frame ${frameMs.toFixed(1)}ms (sampled)`);
        }
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  disposers.push(() => {
    window.removeEventListener('scroll', onScroll);
    if (rafId) window.cancelAnimationFrame(rafId);
  });

  console.warn('[gesture-perf] Collections scroll monitor active (?gesturePerf)');

  return () => {
    for (const dispose of disposers) dispose();
  };
}
