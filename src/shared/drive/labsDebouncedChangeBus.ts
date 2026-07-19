import type { LabsDrivePortfolioLocalChangeEvent } from './useLabsDrivePortfolioAutoSync';

export type LabsLocalChangeListener = (event?: LabsDrivePortfolioLocalChangeEvent) => void;

export type LabsDebouncedChangeBus = {
  subscribe(onChange: LabsLocalChangeListener): () => void;
  /** Coalesce rapid local writes (e.g. per-file Dexie inserts) into one flush. */
  notify(options?: { debounceMs?: number; immediate?: boolean }): void;
  /** True while a debounced notify is armed but not yet flushed. */
  isPending(): boolean;
};

const DEFAULT_DEBOUNCE_MS = 750;

/**
 * Shared debounced local-change bus behind each app's `notify<App>LocalChange` /
 * `subscribe<App>LocalChanges` pair (Gesture, Zinebox, Lyrefly). `immediate`
 * flushes now with `{ immediate: true }` so Drive auto-push skips its debounce;
 * otherwise one trailing flush fires after the debounce window.
 */
export function createLabsDebouncedChangeBus(): LabsDebouncedChangeBus {
  const listeners = new Set<LabsLocalChangeListener>();
  let timer: number | null = null;
  let pending = false;

  const flush = (immediate: boolean): void => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
    pending = false;
    const event: LabsDrivePortfolioLocalChangeEvent | undefined = immediate
      ? { immediate: true }
      : undefined;
    for (const fn of listeners) fn(event);
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    notify(options) {
      if (options?.immediate) {
        flush(true);
        return;
      }
      pending = true;
      if (timer != null) return;
      timer = window.setTimeout(() => flush(false), options?.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    },
    isPending() {
      return pending;
    },
  };
}
