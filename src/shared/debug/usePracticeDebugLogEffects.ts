import { useEffect, type RefObject } from 'react';

/** Poll practice debug log (piano + scales debug docks). Pass a `useCallback` tick. */
export function usePracticeDebugLogPoll(tick: () => void): void {
  useEffect(() => {
    const iv = window.setInterval(tick, 420);
    return () => clearInterval(iv);
  }, [tick]);
}

/** Keep a fixed-height log scrolled to the latest line. */
export function usePracticeDebugLogScrollToEnd(
  logRef: RefObject<HTMLDivElement | null>,
  scrollTrigger: unknown,
): void {
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logRef, scrollTrigger]);
}
