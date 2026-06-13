/**
 * Browser URL for Drive `files.get` **alt=media** (guest / anyone-with-link reads).
 *
 * In **local dev**, Encore uses the same-origin Vite route `/__encore/drive-public/…` (see
 * `vite.config.ts`) so HTTP-referrer–restricted API keys work. **Production** builds call
 * `googleapis.com` directly; redirects to `googleusercontent.com` can cause CORS failures in
 * some browsers—operators may need their own server-side or same-origin fetch if that occurs.
 */

/** True when guest Drive reads should use `/{origin}/__encore/drive-public/…` (Vite dev only). */
export function shouldUsePublicDriveSameOriginProxy(): boolean {
  if (import.meta.env.MODE === 'test') return false;
  return Boolean(import.meta.env.DEV);
}

/** True when the app can attempt a guest snapshot / public Drive JSON read. */
export function isPublicDriveGuestFetchConfigured(): boolean {
  const key = (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined)?.trim();
  return Boolean(key) || shouldUsePublicDriveSameOriginProxy();
}

function buildPublicDriveProxyMediaUrl(fileId: string, suffix: 'media' | 'meta'): string | undefined {
  if (!shouldUsePublicDriveSameOriginProxy()) return undefined;
  if (typeof window === 'undefined' || typeof window.location?.origin !== 'string') return undefined;
  const base = window.location.origin.replace(/\/$/, '');
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
