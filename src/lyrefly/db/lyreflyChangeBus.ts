import type { LabsDrivePortfolioLocalChangeEvent } from '../../shared/drive/useLabsDrivePortfolioAutoSync';

type Listener = (event?: LabsDrivePortfolioLocalChangeEvent) => void;

const listeners = new Set<Listener>();

let notifyTimer: number | null = null;
let pendingImmediate = false;

const DEFAULT_DEBOUNCE_MS = 750;

export function subscribeLyreflyLocalChanges(onChange: Listener): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function flushLyreflyLocalChange(immediate: boolean): void {
  notifyTimer = null;
  pendingImmediate = false;
  const event: LabsDrivePortfolioLocalChangeEvent | undefined = immediate ? { immediate: true } : undefined;
  for (const fn of listeners) fn(event);
}

/** Coalesce rapid Dexie writes into one debounced Drive auto-push. */
export function notifyLyreflyLocalChange(options?: { debounceMs?: number; immediate?: boolean }): void {
  if (options?.immediate) {
    pendingImmediate = true;
    if (notifyTimer != null) {
      window.clearTimeout(notifyTimer);
      notifyTimer = null;
    }
    flushLyreflyLocalChange(true);
    return;
  }

  if (notifyTimer != null) return;

  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  notifyTimer = window.setTimeout(() => flushLyreflyLocalChange(pendingImmediate), debounceMs);
}
