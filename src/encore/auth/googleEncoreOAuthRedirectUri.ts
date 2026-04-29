/**
 * OAuth `redirect_uri` for Encore’s GIS token client.
 * Must **exactly** match an entry under "Authorized redirect URIs" (Google compares the full string).
 *
 * Uses `/encore` **without** a trailing slash — that matches the common Cloud Console pattern
 * (`http://127.0.0.1:5173/encore`). If your client lists `.../encore/` instead, set
 * `VITE_GOOGLE_OAUTH_REDIRECT_URI` to that exact value.
 */
export function googleEncoreOAuthRedirectUri(): string {
  return `${window.location.origin}/encore`;
}
