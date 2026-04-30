declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          /** Revokes the token and clears user grant state for this client (best-effort). */
          revoke?: (accessToken: string, onDone: () => void) => void;
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            /** Must match Google Cloud Console "Authorized redirect URIs" exactly. */
            redirect_uri?: string;
            callback: (resp: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
          }) => { requestAccessToken: (override?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

const DEFAULT_SCRIPT_TIMEOUT_MS = 20_000;

let loadPromise: Promise<void> | null = null;

function scriptElementLoad(scriptEl: HTMLScriptElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      scriptEl.removeEventListener('load', onLoad);
      scriptEl.removeEventListener('error', onError);
      reject(new Error(`Google sign-in script did not load within ${timeoutMs}ms`));
    }, timeoutMs);
    const cleanup = () => clearTimeout(timer);
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('GIS load failed'));
    };
    scriptEl.addEventListener('load', onLoad, { once: true });
    scriptEl.addEventListener('error', onError, { once: true });
  });
}

/** Resolves when `google.accounts.oauth2` exists (covers tag already loaded before we attached `load`). */
function waitForGoogleOAuthClient(maxMs: number): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const id = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(id);
        resolve();
      } else if (Date.now() - start >= maxMs) {
        window.clearInterval(id);
        reject(new Error('Google sign-in API did not become available'));
      }
    }, 80);
  });
}

export function loadGoogleIdentityScript(timeoutMs = DEFAULT_SCRIPT_TIMEOUT_MS): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const inner = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      void Promise.race([scriptElementLoad(existing, timeoutMs), waitForGoogleOAuthClient(timeoutMs)])
        .then(() => waitForGoogleOAuthClient(4000))
        .then(resolve, reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
    void scriptElementLoad(s, timeoutMs)
      .then(() => waitForGoogleOAuthClient(8000))
      .then(resolve, reject);
  });

  loadPromise = inner.catch((e) => {
    loadPromise = null;
    throw e;
  });
  return loadPromise;
}

export interface GoogleUserProfile {
  email: string;
  given_name?: string | null;
  name?: string | null;
}

/** Google OAuth2 userinfo (includes `given_name` / `name` when the account provides them). */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`userinfo failed: ${res.status}`);
  }
  const data = (await res.json()) as { email?: string; given_name?: string; name?: string };
  if (!data.email) throw new Error('No email on account');
  return {
    email: data.email,
    given_name: data.given_name ?? null,
    name: data.name ?? null,
  };
}

/** Prefer given name, then first token of full name, then a title-cased email local-part. */
export function friendlyGoogleDisplayName(profile: GoogleUserProfile): string {
  const given = profile.given_name?.trim();
  if (given) return given;
  const full = profile.name?.trim();
  if (full) {
    const first = full.split(/\s+/)[0]?.trim();
    if (first) return first;
  }
  const local = profile.email.split('@')[0] ?? 'Friend';
  if (!local) return 'Friend';
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}
