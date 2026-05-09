const STORAGE_KEY = 'encore_google_oauth_v1';
const IDENTITY_STORAGE_KEY = 'encore_google_identity_v1';

/**
 * Fired on this window after identity is written or cleared. The native `storage` event does not
 * run in the tab that performed `localStorage.setItem`, so hooks like {@link useLabsEncoreGoogleIdentity}
 * listen for this to stay in sync after Drive token flows.
 */
export const LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT = 'labs_encore_google_identity_changed';

function dispatchEncoreGoogleIdentityChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT));
}

export interface EncoreGooglePersistedSession {
  accessToken: string;
  /** Epoch ms — token treated as invalid at or after this instant */
  expiresAtMs: number;
}

/**
 * Identity hint persisted **separately** from the access token so the account UI can keep showing
 * "Signed in as foo@bar.com" after a 1-hour Google access token expires. The browser can no longer
 * call Drive (so writes will fail until the user clicks "Sign in again"), but kicking the user
 * back to the full-screen sign-in gate every hour was the loudest source of "Encore keeps making
 * me sign in" complaints. Identity stays put until the user explicitly signs out / disconnects.
 */
export interface EncoreGooglePersistedIdentity {
  email: string;
  displayName: string;
  /** Epoch ms when this identity record was last refreshed via `userinfo`. */
  rememberedAtMs: number;
}

function defaultExpiresAtMs(expiresInSeconds?: number): number {
  const sec = typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3600;
  const clamped = Math.max(120, Math.min(sec, 7200));
  /** Proactive refresh margin: Encore renews via `prompt: none` before Google cuts off the access token. */
  const bufferMs = 300_000;
  return Date.now() + clamped * 1000 - bufferMs;
}

export function readPersistedGoogleSession(): EncoreGooglePersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { accessToken?: string; expiresAtMs?: number };
    if (typeof parsed.accessToken !== 'string' || !parsed.accessToken) return null;
    if (typeof parsed.expiresAtMs !== 'number' || !Number.isFinite(parsed.expiresAtMs)) return null;
    return { accessToken: parsed.accessToken, expiresAtMs: parsed.expiresAtMs };
  } catch {
    return null;
  }
}

export function writePersistedGoogleSession(accessToken: string, expiresInSeconds?: number): void {
  if (typeof window === 'undefined') return;
  const payload: EncoreGooglePersistedSession = {
    accessToken,
    expiresAtMs: defaultExpiresAtMs(expiresInSeconds),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPersistedGoogleSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export function isPersistedSessionStillFresh(session: EncoreGooglePersistedSession, nowMs = Date.now()): boolean {
  return session.expiresAtMs > nowMs + 60_000;
}

export function readPersistedGoogleIdentity(): EncoreGooglePersistedIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      email?: string;
      displayName?: string;
      rememberedAtMs?: number;
    };
    if (typeof parsed.email !== 'string' || !parsed.email.trim()) return null;
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    const rememberedAtMs =
      typeof parsed.rememberedAtMs === 'number' && Number.isFinite(parsed.rememberedAtMs)
        ? parsed.rememberedAtMs
        : 0;
    return { email: parsed.email.trim(), displayName, rememberedAtMs };
  } catch {
    return null;
  }
}

export function writePersistedGoogleIdentity(identity: { email: string; displayName: string }): void {
  if (typeof window === 'undefined') return;
  const payload: EncoreGooglePersistedIdentity = {
    email: identity.email,
    displayName: identity.displayName,
    rememberedAtMs: Date.now(),
  };
  try {
    window.localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(payload));
    dispatchEncoreGoogleIdentityChanged();
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPersistedGoogleIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
    dispatchEncoreGoogleIdentityChanged();
  } catch {
    /* ignore */
  }
}

/**
 * Heuristic: is a thrown error from `userinfo` (or `finalizeGoogleSession`) likely caused by an
 * **invalid / revoked token** vs. something transient (network, 5xx, timeout)? We use this so the
 * session-restore path only nukes the saved token when Google actually rejected it. Network blips
 * used to silently sign the user out — the kind of thing that prompts "Encore makes me re-login
 * constantly" complaints.
 */
export function isLikelyGoogleAuthRejection(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : String(err);
  // userinfo currently throws "userinfo failed: <status>"; matches 401 / 403 only.
  return /(userinfo failed:\s*40[13])|invalid_token|invalid_grant|invalid credentials|unauthorized/i.test(msg);
}
