/**
 * Shared URL semantics for “debug mode” across labs micro-apps.
 * Both `debug` and `dev` query keys enable the same mode so bookmarks and docs stay consistent.
 */

const EXPLICIT_OFF = new Set(['0', 'false', 'no', 'off']);

function queryKeyMeansOn(params: URLSearchParams, key: string): boolean {
  if (!params.has(key)) return false;
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return true;
  if (EXPLICIT_OFF.has(raw.trim().toLowerCase())) return false;
  return true;
}

function parseSearch(search: string): URLSearchParams {
  const trimmed = search.trim();
  const normalized = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  return new URLSearchParams(normalized);
}

/**
 * True when `debug` and/or `dev` is set in a way that enables labs debug tooling.
 * - `?debug`, `?debug=`, `?debug=1`, `?debug=true`, … → on
 * - `?dev=1` (cats legacy) → on
 * - `?debug=false`, `?debug=0`, … → off
 */
export function isLabsDebugEnabled(search: string): boolean {
  const params = parseSearch(search);
  return queryKeyMeansOn(params, 'debug') || queryKeyMeansOn(params, 'dev');
}

/** Cats-style overlay flag (`?overlay=1` / `?overlay=true`). */
export function isLabsOverlayEnabled(search: string): boolean {
  const params = parseSearch(search);
  return queryKeyMeansOn(params, 'overlay');
}

/** Read from the browser location; safe to call when `window` is undefined (SSR/tests). */
export function readLabsDebugFromLocation(): { debug: boolean; overlay: boolean } {
  if (typeof window === 'undefined') {
    return { debug: false, overlay: false };
  }
  const search = window.location.search;
  return {
    debug: isLabsDebugEnabled(search),
    overlay: isLabsOverlayEnabled(search),
  };
}
