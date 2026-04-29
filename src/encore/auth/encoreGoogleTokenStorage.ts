const STORAGE_KEY = 'encore_google_oauth_v1';

export interface EncoreGooglePersistedSession {
  accessToken: string;
  /** Epoch ms — token treated as invalid at or after this instant */
  expiresAtMs: number;
}

function defaultExpiresAtMs(expiresInSeconds?: number): number {
  const sec = typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds) ? expiresInSeconds : 3600;
  const clamped = Math.max(120, Math.min(sec, 7200));
  // Refresh a bit before Google’s real expiry to avoid mid-request 401s
  const bufferMs = 120_000;
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
