import { useCallback, useEffect, useRef, useState } from 'react';

/** Matches the delay the filter hook used before this moved down the tree. */
export const LIBRARY_SEARCH_DEBOUNCE_MS = 220;

/**
 * Own the search box's raw text locally, and publish it upward only on a debounce.
 *
 * `searchQuery` used to live in `useLibraryRepertoireFilters`, called from `LibraryScreen` — 2,652
 * lines. Every keystroke re-rendered that whole component and its subtree. The *filtering* was
 * debounced, so the expensive query was protected; the render was not. At a realistic library
 * (60 songs, 240 performances, 20 originals) typing 26 characters produced 27 long tasks and
 * blocked the main thread for seconds, which is why keystrokes were dropped unless you typed
 * slowly.
 *
 * Keeping the raw value here means the parent re-renders once the typing settles instead of once
 * per key. The published value is still debounced by the same 220 ms, so filtering feels the same.
 *
 * The `external` resync exists because the value can also change from outside — restoring a saved
 * search, or clearing. Comparing against what we last published (rather than against the draft)
 * distinguishes "the parent told us something new" from "the parent is echoing us back".
 */
export function useDebouncedSearchDraft(
  external: string,
  publish: (next: string) => void,
  delayMs: number = LIBRARY_SEARCH_DEBOUNCE_MS,
): { draft: string; setDraft: (next: string) => void } {
  const [draft, setDraftState] = useState(external);
  const publishedRef = useRef(external);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishRef = useRef(publish);
  publishRef.current = publish;

  useEffect(() => {
    if (external !== publishedRef.current) {
      publishedRef.current = external;
      setDraftState(external);
    }
  }, [external]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const setDraft = useCallback(
    (next: string) => {
      setDraftState(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        publishedRef.current = next;
        publishRef.current(next);
      }, delayMs);
    },
    [delayMs],
  );

  return { draft, setDraft };
}
