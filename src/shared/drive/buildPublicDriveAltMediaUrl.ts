/**
 * Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads).
 *
 * - **Dev:** same-origin Vite proxy (`/__encore/drive-public/…`) so referrer-restricted keys work.
 * - **Production (optional):** set `VITE_ENCORE_DRIVE_PUBLIC_PROXY=1` and deploy an edge proxy
 *   that forwards to Google (see `workers/encore-drive-public-proxy.mjs`). Direct browser calls to
 *   `googleapis.com` + `alt=media` often fail after a redirect to `googleusercontent.com` (no CORS).
 */
function envFlagTruthy(raw: string | boolean | undefined): boolean {
  if (raw === true) return true;
  if (typeof raw !== 'string') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** True when guest Drive reads should use `/{origin}/__encore/drive-public/…` (or `VITE_ENCORE_DRIVE_PUBLIC_PROXY_BASE`). */
export function shouldUsePublicDriveSameOriginProxy(): boolean {
  if (envFlagTruthy(import.meta.env.VITE_ENCORE_DRIVE_PUBLIC_PROXY)) {
    return true;
  }
  if (import.meta.env.MODE === 'test') return false;
  return Boolean(import.meta.env.DEV);
}

function publicDriveProxyOriginBase(): string | undefined {
  const configured = (import.meta.env.VITE_ENCORE_DRIVE_PUBLIC_PROXY_BASE as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
    return window.location.origin;
  }
  return undefined;
}

function buildPublicDriveProxyMediaUrl(fileId: string, suffix: 'media' | 'meta'): string | undefined {
  if (!shouldUsePublicDriveSameOriginProxy()) return undefined;
  const base = publicDriveProxyOriginBase();
  if (!base) return undefined;
  const path =
    suffix === 'media'
      ? `/__encore/drive-public/${encodeURIComponent(fileId)}`
      : `/__encore/drive-public-meta/${encodeURIComponent(fileId)}`;
  return `${base}${path}`;
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
  const proxied = buildPublicDriveProxyMediaUrl(fileId, 'media');
  if (proxied) return proxied;
  const supportsAllDrives = opts?.supportsAllDrives === true ? 'true' : 'false';
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=${supportsAllDrives}&key=${encodeURIComponent(apiKey)}`;
}

/** Same-origin proxy or direct API key `files.get` metadata (for shortcut resolution before `alt=media`). */
export function buildPublicDriveFileMetadataUrl(
  fileId: string,
  apiKey: string,
  opts?: BuildPublicDriveUrlOpts,
): string {
  const proxied = buildPublicDriveProxyMediaUrl(fileId, 'meta');
  if (proxied) return proxied;
  const fields = encodeURIComponent('mimeType,name,shortcutDetails');
  const supportsAllDrives = opts?.supportsAllDrives === true ? 'true' : 'false';
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=${supportsAllDrives}&key=${encodeURIComponent(apiKey)}`;
}
