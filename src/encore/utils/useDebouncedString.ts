import { useEffect, useState } from 'react';

/** Returns `value` after it has stayed stable for `delayMs` milliseconds. */
export function useDebouncedString(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
