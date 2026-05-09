/**
 * OAuth `redirect_uri` for GIS `initTokenClient`.
 * Must **exactly** match an entry under "Authorized redirect URIs" in Google Cloud Console.
 *
 * Resolution order:
 * 1. `VITE_GOOGLE_OAUTH_REDIRECT_URI` when set (full URL).
 * 2. Else `{origin}/encore` — Encore is the canonical OAuth surface; Stanza/Scales reuse the same
 *    client id and **must not** default to `/stanza` or `/scales` unless those URIs are registered.
 *    Using `/encore` avoids silent GIS failures when only Encore’s redirect is configured.
 *
 * No trailing slash — match Console entries like `https://labs.example.com/encore`.
 */
export function resolveLabsGoogleOAuthRedirectUri(): string {
  const raw = (import.meta.env.VITE_GOOGLE_OAUTH_REDIRECT_URI as string | undefined)?.trim();
  if (raw) return raw;
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5173/encore';
  }
  return `${window.location.origin}/encore`;
}
