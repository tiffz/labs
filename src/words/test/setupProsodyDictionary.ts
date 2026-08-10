/**
 * Vitest setup: the CMU dictionary is lazy-loaded in the browser (see
 * prosodyDictionary.ts), but Words tests evaluate modules that generate rhythms at
 * import time (wordsAppDefaults). Top-level await here runs before any test
 * module is imported, so the engine sees a populated dictionary — mirroring
 * the production bootstrap order in words/main.tsx.
 *
 * Scoped to Words. Setup files run once per TEST FILE, so loading the full CMU pronouncing
 * dictionary unconditionally cost every one of the repo's ~850 test files ~129ms for data only
 * Words uses — measured at ~9.3s across a 72-file sample, ~109s across the suite, on every commit
 * hook, push hook, and CI run.
 */
import { expect } from 'vitest';
import { loadProsodyDictionary } from '../utils/prosodyDictionary';

const testPath = expect.getState().testPath ?? '';
if (testPath.includes('/words/')) {
  await loadProsodyDictionary();
}
