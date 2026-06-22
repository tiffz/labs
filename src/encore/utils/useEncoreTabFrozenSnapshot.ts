import { useRef } from 'react';

/**
 * When an Encore keep-alive list tab is hidden, return the last active snapshot so a memoized
 * body can skip re-renders while Dexie live queries still update in the thin wrapper shell.
 */
export function useEncoreTabFrozenSnapshot<T>(active: boolean, value: T): T {
  const ref = useRef(value);
  if (active) ref.current = value;
  return active ? value : ref.current;
}

/** Shallow compare for memoized tab bodies — skip when both sides are inactive. */
export function encoreTabBodyPropsAreEqual<P extends { tabActive: boolean }>(prev: P, next: P): boolean {
  if (!prev.tabActive && !next.tabActive) return true;
  if (prev.tabActive !== next.tabActive) return false;
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)] as (keyof P)[]);
  for (const key of keys) {
    if (prev[key] !== next[key]) return false;
  }
  return true;
}
