type Listener = () => void;

const listeners = new Set<Listener>();

let notifyTimer: number | null = null;

const DEFAULT_DEBOUNCE_MS = 750;

export function subscribeZineboxLocalChanges(onChange: Listener): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function flushZineboxLocalChange(): void {
  notifyTimer = null;
  for (const fn of listeners) fn();
}

/** Coalesce rapid Dexie writes into one debounced Drive auto-push. */
export function notifyZineboxLocalChange(options?: { debounceMs?: number; immediate?: boolean }): void {
  if (options?.immediate) {
    if (notifyTimer != null) {
      window.clearTimeout(notifyTimer);
      notifyTimer = null;
    }
    flushZineboxLocalChange();
    return;
  }

  if (notifyTimer != null) return;

  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  notifyTimer = window.setTimeout(flushZineboxLocalChange, debounceMs);
}
