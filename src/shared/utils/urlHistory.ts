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
