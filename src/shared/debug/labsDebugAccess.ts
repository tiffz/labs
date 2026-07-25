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
 * The persisted-identity localStorage key. Re-declared here (not imported) to avoid a
 * `shared/debug -> shared/google` module edge in the cycle ledger. It mirrors
 * `ENCORE_GOOGLE_IDENTITY_STORAGE_KEY` in google/encoreGoogleTokenStorage.ts; a test pins them
 * equal so a rename there can't silently drift this owner check.
 */
export const LABS_DEBUG_OWNER_IDENTITY_KEY = 'encore_google_identity_v1';

/**
 * Owner presence: a persisted Google identity means the allowlisted owner signed into a Labs
 * private app on this device (those apps use a restricted OAuth client, so only the owner can).
 * The owner gate is a default-safe UX guard, not a hard security boundary — client code can
 * always self-elevate by writing this key; the destructive controls it unlocks act only on the
 * forger's own browser, and dev-server endpoints stay `import.meta.env.DEV`-gated. ADR 0026.
 */
function ownerSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(LABS_DEBUG_OWNER_IDENTITY_KEY);
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
