/**
 * Browser URL for Drive `files.get` **alt=media** using an API key (guest / anyone-with-link reads).
 * In Vite dev, uses the same-origin proxy as Encore (`/__encore/drive-public/…`) so referrer-restricted keys work.
 */
function isPublicDriveDevProxyActive(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string'
  );
}

export function buildPublicDriveAltMediaUrl(fileId: string, apiKey: string): string {
  if (isPublicDriveDevProxyActive()) {
    return `${window.location.origin}/__encore/drive-public/${encodeURIComponent(fileId)}`;
  }
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`;
}

/** Same-origin dev proxy or direct API key `files.get` metadata (for shortcut resolution before `alt=media`). */
export function buildPublicDriveFileMetadataUrl(fileId: string, apiKey: string): string {
  const fields = encodeURIComponent('mimeType,name,shortcutDetails');
  if (isPublicDriveDevProxyActive()) {
    return `${window.location.origin}/__encore/drive-public-meta/${encodeURIComponent(fileId)}`;
  }
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true&key=${encodeURIComponent(apiKey)}`;
}
