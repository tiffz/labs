import { readLabsDebugFromLocation } from '../utils/readLabsDebugParams';

export type LabsDebugTier = 'off' | 'diagnostics' | 'full';

/**
 * Two-tier debug access, so debug can be safe in production.
 *
 * - `off`: no `?debug`/`?dev`.
 * - `diagnostics`: `?debug` in prod, anonymous — **read-only** telemetry only (counters, heap,
 *   build/version, route state). No mutations, no destructive actions, no god-mode.
 * - `full`: localhost (dev) always, OR `?debug` in prod while the owner is signed in — everything,
 *   including destructive/god-mode/data-dump surfaces.
 *
 * Gate any mutating, destructive, or data-dumping control on {@link isLabsDebugFull}. Read-only
 * readouts may render whenever {@link isLabsDebugVisible}. Rationale: ADR 0026.
 */
export function computeLabsDebugTier(input: {
  debugRequested: boolean;
  isDev: boolean;
  ownerSignedIn: boolean;
}): LabsDebugTier {
  if (!input.debugRequested) return 'off';
  if (input.isDev) return 'full';
  return input.ownerSignedIn ? 'full' : 'diagnostics';
}

/**
 * Owner presence: a persisted Google identity means the allowlisted owner signed into a Labs
 * private app on this device (those apps use a restricted OAuth client, so only the owner can).
 * Read the localStorage key directly to avoid a `shared/debug -> shared/google` module edge
 * (cycle ledger). Key mirrors IDENTITY_STORAGE_KEY in google/encoreGoogleTokenStorage.ts.
 */
function ownerSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem('encore_google_identity_v1');
    if (!raw) return false;
    const v = JSON.parse(raw) as { email?: unknown };
    return typeof v?.email === 'string' && v.email.trim().length > 0;
  } catch {
    return false;
  }
}

/** Debug tier for the current runtime context. */
export function labsDebugAccess(): LabsDebugTier {
  return computeLabsDebugTier({
    debugRequested: readLabsDebugFromLocation().debug,
    isDev: import.meta.env.DEV,
    ownerSignedIn: ownerSignedIn(),
  });
}

/** True on the full (dev/owner) tier — gate destructive + god-mode + data-dump controls on this. */
export function isLabsDebugFull(): boolean {
  return labsDebugAccess() === 'full';
}

/** True when ANY debug surface should render (diagnostics or full). */
export function isLabsDebugVisible(): boolean {
  return labsDebugAccess() !== 'off';
}
