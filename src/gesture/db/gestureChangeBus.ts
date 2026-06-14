type Listener = () => void;

const listeners = new Set<Listener>();

let notifyTimer: number | null = null;
let notifyPending = false;

const DEFAULT_DEBOUNCE_MS = 750;

export function subscribeGestureLocalChanges(onChange: Listener): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function flushGestureLocalChange(): void {
  notifyPending = false;
  notifyTimer = null;
  for (const fn of listeners) fn();
}

/** Coalesce rapid Dexie writes (e.g. per-file uploads) into one UI refresh. */
export function notifyGestureLocalChange(options?: { debounceMs?: number; immediate?: boolean }): void {
  if (options?.immediate) {
    if (notifyTimer != null) {
      window.clearTimeout(notifyTimer);
      notifyTimer = null;
    }
    notifyPending = false;
    flushGestureLocalChange();
    return;
  }

  notifyPending = true;
  if (notifyTimer != null) return;

  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  notifyTimer = window.setTimeout(flushGestureLocalChange, debounceMs);
}

export function isGestureLocalChangePending(): boolean {
  return notifyPending;
}
