/**
 * Moved to `../utils/readLabsDebugParams` so `utils` (serverLogger) does not
 * depend on `debug` while `debug` (labsDebugLog) depends on `utils` — that
 * directory-level cycle is guarded by `sharedModuleCycles.test.ts`.
 * This re-export keeps existing import paths working.
 */
export {
  isLabsDebugEnabled,
  isLabsOverlayEnabled,
  readLabsDebugFromLocation,
} from '../utils/readLabsDebugParams';
