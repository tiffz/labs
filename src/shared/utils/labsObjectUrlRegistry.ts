/**
 * Refcounted `URL.createObjectURL` leases.
 *
 * An object URL is a **strong reference** to its Blob, and `revokeObjectURL` is the only way to
 * release it. So a leaked URL pins the whole Blob for the lifetime of the document.
 *
 * `StanzaLibraryThumb` leaked one per card on purpose, with a documented reason and a wrong cost
 * estimate:
 *
 *   > We deliberately omit the `useEffect` cleanup that would call `URL.revokeObjectURL`. Under
 *   > React Strict Mode, that cleanup runs synchronously while the freshly-mounted `<img>` /
 *   > `<video>` still references `u`, which paints a broken image. […] then leak the final URL into
 *   > GC (~negligible).
 *
 * The Strict Mode diagnosis is right. "Negligible" is right for a JPEG poster and wrong for the
 * video path, which leases a URL over the **entire video blob** — so every unmounted video card
 * pinned a whole video, accumulating across library browsing with nothing able to release it. That
 * is the shape that ends in an out-of-memory tab kill, which by construction leaves no crash-log
 * entry behind to explain itself.
 *
 * Two properties make this safe where the naive cleanup was not:
 *
 *  1. **Refcounting by key.** Several cards showing the same blob share one URL, so a remount does
 *     not mint a second lease over the same bytes.
 *  2. **A revoke grace period.** Release schedules the revoke rather than doing it. Strict Mode's
 *     unmount/remount re-acquires inside the window, cancels the pending revoke, and keeps the same
 *     URL — the paint survives *because* the revoke is deferred, not because it is skipped.
 */

type Lease = {
  url: string;
  refs: number;
  revokeTimer: ReturnType<typeof setTimeout> | null;
};

const leases = new Map<string, Lease>();

/**
 * How long a zero-ref URL survives before being revoked.
 *
 * Only needs to outlast React's synchronous Strict-Mode remount and any single paint; it is not a
 * cache TTL. Keep it short — this window is exactly how long a blob outlives its last viewer.
 */
export const LABS_OBJECT_URL_REVOKE_GRACE_MS = 1_000;

/**
 * Take a lease on an object URL for `blob`, keyed by `key`.
 *
 * `key` must identify the blob's *content* (e.g. `${id}:${size}:${type}`) rather than the object
 * reference, because a Dexie live query hands back a fresh Blob object for unchanged bytes on every
 * emission — keying on identity would mint a new URL per render.
 */
export function acquireLabsObjectUrl(key: string, blob: Blob): string {
  const existing = leases.get(key);
  if (existing) {
    existing.refs += 1;
    if (existing.revokeTimer != null) {
      clearTimeout(existing.revokeTimer);
      existing.revokeTimer = null;
    }
    return existing.url;
  }
  const url = URL.createObjectURL(blob);
  leases.set(key, { url, refs: 1, revokeTimer: null });
  return url;
}

/** Drop one lease. The URL is revoked once nothing holds it and the grace period elapses. */
export function releaseLabsObjectUrl(
  key: string,
  graceMs: number = LABS_OBJECT_URL_REVOKE_GRACE_MS,
): void {
  const lease = leases.get(key);
  if (!lease) return;
  lease.refs -= 1;
  if (lease.refs > 0) return;
  if (lease.revokeTimer != null) clearTimeout(lease.revokeTimer);
  lease.revokeTimer = setTimeout(() => {
    // Re-check: a remount inside the window may have taken the count back up.
    const current = leases.get(key);
    if (!current || current.refs > 0) return;
    leases.delete(key);
    try {
      URL.revokeObjectURL(current.url);
    } catch {
      /* already revoked, or no URL support — nothing left to release */
    }
  }, graceMs);
}

/** Live lease count for a key — for tests and leak assertions. */
export function labsObjectUrlRefCount(key: string): number {
  return leases.get(key)?.refs ?? 0;
}

/** Number of URLs currently held. A session that browses and returns must not grow this. */
export function labsObjectUrlLeaseCount(): number {
  return leases.size;
}

/** Test-only: drop everything without waiting for timers. */
export function resetLabsObjectUrlRegistryForTests(): void {
  for (const lease of leases.values()) {
    if (lease.revokeTimer != null) clearTimeout(lease.revokeTimer);
    try {
      URL.revokeObjectURL(lease.url);
    } catch {
      /* ignore */
    }
  }
  leases.clear();
}
