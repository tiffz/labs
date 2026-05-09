import { encoreHashPathOnlyFragment } from '../routes/encoreAppHash';

/**
 * Guest share URLs use the hash route `#/share/<driveFileId>` on `/encore/`. That fragment is not
 * sent to the server, so we set crawler directives in the document from the client.
 *
 * Optional in-fragment query (e.g. `?scroll=…` pasted from elsewhere) is **ignored** for routing,
 * same as signed-in routes — see {@link encoreHashPathOnlyFragment}.
 *
 * Keep {@link ENCORE_GUEST_SHARE_HASH_RE} in sync with the inline check in `src/encore/index.html`.
 */
export const ENCORE_GUEST_SHARE_HASH_RE = /^#\/share\/[^/?#]+(?:\?[^#]*)?$/;

/**
 * Drive file id from `#/share/<id>` (optional `?…` query is stripped before parse).
 * Pass `hash` (including leading `#`) for tests; otherwise reads `window.location.hash`.
 */
export function parseGuestShareSnapshotFileIdFromHash(hash?: string): string | null {
  const h = hash ?? (typeof window !== 'undefined' ? window.location.hash || '' : '');
  const pathOnly = encoreHashPathOnlyFragment(h);
  const raw = pathOnly.replace(/^#/, '');
  const m = /^\/share\/([^/?#]+)$/.exec(raw);
  return m?.[1] ?? null;
}

/** True when the URL hash is a read-only guest repertoire link (`#/share/<driveFileId>`). */
export function isEncoreGuestShareHash(hash?: string): boolean {
  return parseGuestShareSnapshotFileIdFromHash(hash) !== null;
}

/** `useSyncExternalStore` subscription for Encore hash routes (guest share + in-app `#/` navigation). */
export function subscribeEncoreLocationHash(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('hashchange', onStoreChange);
  return () => window.removeEventListener('hashchange', onStoreChange);
}

export function getEncoreLocationHash(): string {
  return typeof window !== 'undefined' ? window.location.hash || '' : '';
}

export function getEncoreLocationHashServerSnapshot(): string {
  return '';
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
