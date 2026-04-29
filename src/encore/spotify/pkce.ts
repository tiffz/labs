function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let s = '';
  for (let i = 0; i < len; i++) {
    s += chars[arr[i]! % chars.length];
  }
  return s;
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(64);
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { verifier, challenge };
}

const SPOTIFY_VERIFIER_KEY = 'encore_spotify_pkce_verifier';
/** Persisted access + refresh tokens (same tab origin as Google session). PKCE verifier stays in sessionStorage. */
const SPOTIFY_TOKEN_KEY = 'encore_spotify_token_json';

/** Fired on same-tab Spotify token store/clear so UI can refresh connection state. */
export const ENCORE_SPOTIFY_SESSION_EVENT = 'encore-spotify-session-updated';

function notifySpotifySessionChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ENCORE_SPOTIFY_SESSION_EVENT));
}

export interface SpotifyTokenBundle {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
  /** Space-separated scopes Spotify granted (present on new sign-ins; used to detect stale consent). */
  scope?: string;
}

export function storePkceVerifier(verifier: string): void {
  sessionStorage.setItem(SPOTIFY_VERIFIER_KEY, verifier);
}

export function consumePkceVerifier(): string | null {
  const v = sessionStorage.getItem(SPOTIFY_VERIFIER_KEY);
  sessionStorage.removeItem(SPOTIFY_VERIFIER_KEY);
  return v;
}

function parseStoredToken(raw: string | null): SpotifyTokenBundle | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SpotifyTokenBundle;
    if (typeof parsed.access_token !== 'string' || !parsed.access_token) return null;
    if (typeof parsed.expires_at !== 'number' || !Number.isFinite(parsed.expires_at)) return null;
    const scope = typeof parsed.scope === 'string' && parsed.scope.trim() ? parsed.scope : undefined;
    return {
      access_token: parsed.access_token,
      expires_at: parsed.expires_at,
      refresh_token: typeof parsed.refresh_token === 'string' ? parsed.refresh_token : undefined,
      scope,
    };
  } catch {
    return null;
  }
}

export function storeSpotifyToken(bundle: SpotifyTokenBundle): void {
  if (typeof window === 'undefined') return;
  const raw = JSON.stringify(bundle);
  try {
    window.localStorage.setItem(SPOTIFY_TOKEN_KEY, raw);
    try {
      window.sessionStorage.removeItem(SPOTIFY_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  } catch {
    try {
      window.sessionStorage.setItem(SPOTIFY_TOKEN_KEY, raw);
    } catch {
      /* private mode / quota */
    }
  }
  notifySpotifySessionChanged();
}

export function readSpotifyToken(): SpotifyTokenBundle | null {
  if (typeof window === 'undefined') return null;
  const fromLocal = parseStoredToken(window.localStorage.getItem(SPOTIFY_TOKEN_KEY));
  if (fromLocal) return fromLocal;
  const legacy = parseStoredToken(window.sessionStorage.getItem(SPOTIFY_TOKEN_KEY));
  if (legacy) {
    try {
      window.localStorage.setItem(SPOTIFY_TOKEN_KEY, JSON.stringify(legacy));
      window.sessionStorage.removeItem(SPOTIFY_TOKEN_KEY);
      notifySpotifySessionChanged();
    } catch {
      /* keep legacy in session only */
    }
    return legacy;
  }
  return null;
}

export function clearSpotifyToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SPOTIFY_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(SPOTIFY_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  notifySpotifySessionChanged();
}

/** True if a stored Spotify session can obtain an access token (valid access token or refresh token). */
export function hasUsableSpotifyTokenBundle(): boolean {
  const b = readSpotifyToken();
  if (!b?.access_token) return false;
  if (Date.now() <= b.expires_at) return true;
  return Boolean(b.refresh_token);
}

export function spotifyAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
  /** Space-separated Spotify scopes (required for playlist import, etc.). */
  scope: string;
}): string {
  const u = new URL('https://accounts.spotify.com/authorize');
  u.searchParams.set('client_id', params.clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', params.redirectUri);
  u.searchParams.set('scope', params.scope);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('code_challenge', params.challenge);
  u.searchParams.set('state', params.state);
  return u.toString();
}

/** Returns a valid access token, refreshing with `refresh_token` when expired. */
export async function ensureSpotifyAccessToken(clientId: string): Promise<string | null> {
  const bundle = readSpotifyToken();
  if (!bundle?.access_token) return null;
  if (Date.now() <= bundle.expires_at) return bundle.access_token;
  if (!bundle.refresh_token) return null;
  try {
    const next = await refreshSpotifyToken(clientId, bundle.refresh_token, bundle.scope);
    storeSpotifyToken(next);
    return next.access_token;
  } catch {
    return null;
  }
}

export async function refreshSpotifyToken(
  clientId: string,
  refreshToken: string,
  previousScope?: string,
): Promise<SpotifyTokenBundle> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token refresh failed: ${res.status} ${t}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };
  const scope =
    typeof data.scope === 'string' && data.scope.trim() ? data.scope : previousScope?.trim() || undefined;
  return {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000 - 30_000,
    refresh_token: data.refresh_token ?? refreshToken,
    scope,
  };
}

export async function exchangeSpotifyCode(params: {
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): Promise<SpotifyTokenBundle> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.verifier,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token exchange failed: ${res.status} ${t}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };
  const scope = typeof data.scope === 'string' && data.scope.trim() ? data.scope : undefined;
  return {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000 - 30_000,
    refresh_token: data.refresh_token,
    scope,
  };
}
