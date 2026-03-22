import { getHistoryUpdateStrategy, type HistoryUpdateStrategy } from './urlHistory';

export interface UrlRoutingHistoryState {
  lastPushTime: number;
}

export interface UrlRoutingSyncOptions {
  debounceMs: number;
  replaceDebounceParams: ReadonlySet<string>;
}

export function syncUrlWithHistory(
  newUrl: string,
  historyState: UrlRoutingHistoryState,
  options: UrlRoutingSyncOptions,
  now: number = Date.now()
): HistoryUpdateStrategy {
  const currentUrl = `${window.location.pathname}${window.location.search}`;
  const strategy = getHistoryUpdateStrategy({
    currentUrl,
    newUrl,
    now,
    lastPushTime: historyState.lastPushTime,
    debounceMs: options.debounceMs,
    replaceDebounceParams: options.replaceDebounceParams,
  });

  if (strategy === 'replace') {
    window.history.replaceState({}, '', newUrl);
  } else if (strategy === 'push') {
    window.history.pushState({}, '', newUrl);
    historyState.lastPushTime = now;
  }

  return strategy;
}

export function subscribeToPopState(onPopState: () => void): () => void {
  const handler = () => onPopState();
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}
