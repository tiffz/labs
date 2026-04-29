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

let loadPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('GIS load failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GIS load failed'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed: ${res.status}`);
  }
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error('No email on account');
  return data.email;
}
