export type HistoryUpdateStrategy = 'push' | 'replace' | 'skip';

interface UrlHistoryStrategyInput {
  currentUrl: string;
  newUrl: string;
  now: number;
  lastPushTime: number;
  debounceMs: number;
  replaceDebounceParams: ReadonlySet<string>;
}

function getSearchString(url: string): string {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
}

export function getChangedQueryParams(currentUrl: string, newUrl: string): Set<string> {
  const currentParams = new URLSearchParams(getSearchString(currentUrl));
  const nextParams = new URLSearchParams(getSearchString(newUrl));

  const keys = new Set<string>();
  for (const key of currentParams.keys()) keys.add(key);
  for (const key of nextParams.keys()) keys.add(key);

  const changed = new Set<string>();
  for (const key of keys) {
    if (currentParams.get(key) !== nextParams.get(key)) {
      changed.add(key);
    }
  }

  return changed;
}

export function getHistoryUpdateStrategy(input: UrlHistoryStrategyInput): HistoryUpdateStrategy {
  const { currentUrl, newUrl, now, lastPushTime, debounceMs, replaceDebounceParams } = input;
  if (newUrl === currentUrl) return 'skip';

  const changedParams = getChangedQueryParams(currentUrl, newUrl);
  const onlyDebouncedParams =
    changedParams.size > 0 &&
    [...changedParams].every((key) => replaceDebounceParams.has(key));

  if (onlyDebouncedParams && now - lastPushTime < debounceMs) {
    return 'replace';
  }

  return 'push';
}

// ---------------------------------------------------------------------------
// Throttled history updates
// ---------------------------------------------------------------------------
// Browsers enforce a rate limit on history.replaceState / pushState
// (~100 calls per 10 seconds). Rapid UI interactions (holding BPM +/-)
// can easily exceed this. These helpers coalesce rapid calls so the
// final URL is always written but the browser limit is never hit.

const THROTTLE_MS = 200;

let pendingReplace: string | null = null;
let replaceTimer: ReturnType<typeof setTimeout> | null = null;

function flushReplace() {
  if (pendingReplace !== null) {
    window.history.replaceState({}, '', pendingReplace);
    pendingReplace = null;
  }
  replaceTimer = null;
}

/**
 * Throttled `history.replaceState`. Coalesces rapid calls so the browser's
 * rate limit (100 per 10s) is never exceeded. The most recent URL is always
 * written within `THROTTLE_MS` of the last call.
 */
export function throttledReplaceState(url: string): void {
  pendingReplace = url;
  if (replaceTimer === null) {
    replaceTimer = setTimeout(flushReplace, THROTTLE_MS);
  }
}

let pendingPush: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function flushPush() {
  if (pendingPush !== null) {
    window.history.pushState({}, '', pendingPush);
    pendingPush = null;
  }
  pushTimer = null;
}

/**
 * Throttled `history.pushState`. Same coalescing behavior as
 * `throttledReplaceState` but creates a new history entry.
 */
export function throttledPushState(url: string): void {
  pendingPush = url;
  if (pushTimer === null) {
    pushTimer = setTimeout(flushPush, THROTTLE_MS);
  }
}

/**
 * Force-flush all pending throttled history updates. Useful in tests
 * that check URL state immediately after a sync call.
 */
export function flushPendingHistoryUpdates(): void {
  if (replaceTimer !== null) {
    clearTimeout(replaceTimer);
    flushReplace();
  }
  if (pushTimer !== null) {
    clearTimeout(pushTimer);
    flushPush();
  }
}
