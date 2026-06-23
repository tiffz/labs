/**
 * Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads).
 *
 * - **Local dev:** same-origin Vite route `/__encore/drive-public/…` (see `vite.config.ts`).
 * - **Production:** when `VITE_LABS_SESSION_BFF_URL` is set, the session BFF proxies Drive
 *   server-side (avoids browser CORS/redirect failures and referrer mismatches).
 * - **Fallback:** direct `googleapis.com` with `VITE_GOOGLE_API_KEY` (fragile on static hosting).
 */

export type PublicDriveFetchRoute = 'direct' | 'vite-dev' | 'bff';

function normalizeBaseUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/$/, '');
}

export function resolvePublicDriveFetchRoute(): PublicDriveFetchRoute {
  const mode = import.meta.env.MODE;
  if (mode === 'test') return 'direct';
  if (mode === 'development') return 'vite-dev';
  if (normalizeBaseUrl(import.meta.env.VITE_LABS_SESSION_BFF_URL as string | undefined)) return 'bff';
  return 'direct';
}

/** @deprecated Prefer {@link resolvePublicDriveFetchRoute}. */
export function shouldUsePublicDriveSameOriginProxy(): boolean {
  return resolvePublicDriveFetchRoute() === 'vite-dev';
}

/** True when the app can attempt a guest snapshot / public Drive JSON read. */
export function isPublicDriveGuestFetchConfigured(): boolean {
  const key = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
  if (key) return true;
  return resolvePublicDriveFetchRoute() !== 'direct';
}

function buildViteDevProxyUrl(fileId: string, suffix: 'media' | 'meta'): string | undefined {
  if (resolvePublicDriveFetchRoute() !== 'vite-dev') return undefined;
  if (typeof window === 'undefined' || typeof window.location?.origin !== 'string') return undefined;
  const base = window.location.origin.replace(/\/$/, '');
  const path =
    suffix === 'media'
      ? `/__encore/drive-public/${encodeURIComponent(fileId)}`
      : `/__encore/drive-public-meta/${encodeURIComponent(fileId)}`;
  return `${base}${path}`;
}

function buildBffProxyUrl(
  fileId: string,
  suffix: 'media' | 'meta',
  supportsAllDrives: boolean,
): string | undefined {
  if (resolvePublicDriveFetchRoute() !== 'bff') return undefined;
  const bff = normalizeBaseUrl(import.meta.env.VITE_LABS_SESSION_BFF_URL as string | undefined);
  if (!bff) return undefined;
  const supports = supportsAllDrives ? 'true' : 'false';
  return `${bff}/v1/public-drive/files/${encodeURIComponent(fileId)}/${suffix}?supportsAllDrives=${supports}`;
}

export type BuildPublicDriveUrlOpts = {
  /** Default `false` (Encore snapshots live in My Drive). Use `true` for shared-drive files. */
  supportsAllDrives?: boolean;
};

export function buildPublicDriveAltMediaUrl(
  fileId: string,
  apiKey: string,
  opts?: BuildPublicDriveUrlOpts,
): string {
  const proxiedDev = buildViteDevProxyUrl(fileId, 'media');
  if (proxiedDev) return proxiedDev;
  const proxiedBff = buildBffProxyUrl(fileId, 'media', opts?.supportsAllDrives === true);
  if (proxiedBff) return proxiedBff;
  const supportsAllDrives = opts?.supportsAllDrives === true ? 'true' : 'false';
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=${supportsAllDrives}&key=${encodeURIComponent(apiKey)}`;
}

/** Same-origin proxy or direct API key `files.get` metadata (for shortcut resolution before `alt=media`). */
export function buildPublicDriveFileMetadataUrl(
  fileId: string,
  apiKey: string,
  opts?: BuildPublicDriveUrlOpts,
): string {
  const proxiedDev = buildViteDevProxyUrl(fileId, 'meta');
  if (proxiedDev) return proxiedDev;
  const proxiedBff = buildBffProxyUrl(fileId, 'meta', opts?.supportsAllDrives === true);
  if (proxiedBff) return proxiedBff;
  const fields = encodeURIComponent('mimeType,name,shortcutDetails');
  const supportsAllDrives = opts?.supportsAllDrives === true ? 'true' : 'false';
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=${supportsAllDrives}&key=${encodeURIComponent(apiKey)}`;
}
