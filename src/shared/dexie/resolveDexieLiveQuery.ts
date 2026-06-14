/**
 * Dexie `useLiveQuery` returns `undefined` until the first emission — not an empty result.
 * Use this helper so UI can distinguish loading from a real empty library.
 *
 * Reference: Encore `songsHydrated` in `EncoreLibraryContext.tsx`.
 */
export function resolveDexieLiveQuery<T>(
  raw: T | undefined,
  fallback: T,
): { value: T; hydrated: boolean } {
  return { value: raw ?? fallback, hydrated: raw !== undefined };
}
