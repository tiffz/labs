/**
 * Vitest setup: the CMU dictionary is lazy-loaded in the browser (see
 * prosodyDictionary.ts), but tests evaluate modules that generate rhythms at
 * import time (wordsAppDefaults). Top-level await here runs before any test
 * module is imported, so the engine sees a populated dictionary — mirroring
 * the production bootstrap order in words/main.tsx.
 */
import { loadProsodyDictionary } from '../utils/prosodyDictionary';

await loadProsodyDictionary();
