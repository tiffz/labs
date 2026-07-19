/**
 * Lazy loader for the CMU pronouncing dictionary (~3.6 MB raw). The dynamic
 * import keeps it out of the Words entry chunk (see docs/PERFORMANCE_BUDGETS.md);
 * `main.tsx` awaits `loadProsodyDictionary()` before importing the app so the
 * prosody engine can keep reading it synchronously.
 */

// Live binding: prosodyEngine reads this after load; empty until then.
export let prosodyDictionary: Record<string, string> = {};

let loadPromise: Promise<void> | null = null;

export function loadProsodyDictionary(): Promise<void> {
  loadPromise ??= import('cmu-pronouncing-dictionary').then((mod) => {
    prosodyDictionary = mod.dictionary;
  });
  return loadPromise;
}
