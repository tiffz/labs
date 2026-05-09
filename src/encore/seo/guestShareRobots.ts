/**
 * Guest share URLs use the hash route `#/share/<driveFileId>` on `/encore/`. That fragment is not
 * sent to the server, so we set crawler directives in the document from the client.
 *
 * Keep {@link ENCORE_GUEST_SHARE_HASH_RE} in sync with the inline check in `src/encore/index.html`.
 */
export const ENCORE_GUEST_SHARE_HASH_RE = /^#\/share\/[^/?#]+$/;

/** True when the URL hash is a read-only guest repertoire link (`#/share/<driveFileId>`). */
export function isEncoreGuestShareHash(hash?: string): boolean {
  const h = hash ?? (typeof window !== 'undefined' ? window.location.hash || '' : '');
  return ENCORE_GUEST_SHARE_HASH_RE.test(h);
}

const META_ID = 'encore-guest-share-robots';

/** Restrictive: no indexing, no following links, no cache snippet, no text snippet in results. */
const ROBOTS_ATTRS: Array<[string, string]> = [
  ['name', 'robots'],
  ['content', 'noindex, nofollow, noarchive, nosnippet'],
];

/**
 * Adds or removes `<meta name="robots" …>` based on whether the location hash is a guest share URL.
 * Idempotent; safe to call on every `hashchange`.
 */
export function syncEncoreGuestShareRobotsFromHash(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const isGuestShare = isEncoreGuestShareHash();
  const existing = document.getElementById(META_ID);
  if (!isGuestShare) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const meta = document.createElement('meta');
  meta.id = META_ID;
  for (const [k, v] of ROBOTS_ATTRS) {
    meta.setAttribute(k, v);
  }
  document.head.appendChild(meta);
}
