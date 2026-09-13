// @vitest-environment node
/**
 * The leak this exists to remove, from `StanzaLibraryThumb`'s own header:
 *
 *   > We deliberately omit the `useEffect` cleanup that would call `URL.revokeObjectURL` […] then
 *   > leak the final URL into GC (~negligible).
 *
 * An object URL is a strong reference to its Blob and `revokeObjectURL` is the only release. For the
 * JPEG poster "negligible" holds; for `StanzaLibraryVideoPosterThumb` the lease is over the entire
 * video blob, so every unmounted video card pinned a whole video for the document's lifetime.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LABS_OBJECT_URL_REVOKE_GRACE_MS,
  acquireLabsObjectUrl,
  labsObjectUrlLeaseCount,
  labsObjectUrlRefCount,
  releaseLabsObjectUrl,
  resetLabsObjectUrlRegistryForTests,
} from './labsObjectUrlRegistry';

let created = 0;
let revoked: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  created = 0;
  revoked = [];
  // node has no object-URL support; stand in for it so the lifecycle is observable.
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
    `blob:test/${++created}`;
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = (u: string) => {
    revoked.push(u);
  };
});

afterEach(() => {
  resetLabsObjectUrlRegistryForTests();
  vi.useRealTimers();
});

const blob = () => ({ size: 123, type: 'video/mp4' }) as Blob;

describe('object URL leases are refcounted', () => {
  it('shares one URL between holders of the same content', () => {
    const a = acquireLabsObjectUrl('song:123:video/mp4', blob());
    const b = acquireLabsObjectUrl('song:123:video/mp4', blob());
    expect(a).toBe(b);
    expect(created).toBe(1);
    expect(labsObjectUrlRefCount('song:123:video/mp4')).toBe(2);
  });

  it('does not revoke while another holder remains', () => {
    acquireLabsObjectUrl('k', blob());
    acquireLabsObjectUrl('k', blob());
    releaseLabsObjectUrl('k');
    vi.advanceTimersByTime(LABS_OBJECT_URL_REVOKE_GRACE_MS * 2);
    expect(revoked).toEqual([]);
  });

  it('revokes once the last holder goes away — the actual fix', () => {
    const url = acquireLabsObjectUrl('k', blob());
    releaseLabsObjectUrl('k');
    expect(revoked).toEqual([]); // deferred, not immediate
    vi.advanceTimersByTime(LABS_OBJECT_URL_REVOKE_GRACE_MS);
    expect(revoked).toEqual([url]);
    expect(labsObjectUrlLeaseCount()).toBe(0);
  });

  it('survives a Strict Mode unmount/remount without breaking the paint', () => {
    // This is precisely the case the old code skipped cleanup to avoid: React releases, then
    // immediately re-acquires. Deferring the revoke means the URL is still valid.
    const first = acquireLabsObjectUrl('k', blob());
    releaseLabsObjectUrl('k');
    const second = acquireLabsObjectUrl('k', blob());
    vi.advanceTimersByTime(LABS_OBJECT_URL_REVOKE_GRACE_MS * 3);
    expect(second).toBe(first);
    expect(revoked).toEqual([]);
    expect(created).toBe(1);
  });

  it('browsing away and back does not accumulate leases — the OOM shape', () => {
    for (let visit = 0; visit < 25; visit += 1) {
      const keys = ['s1:1:video/mp4', 's2:2:video/mp4', 's3:3:video/mp4'];
      keys.forEach((k) => acquireLabsObjectUrl(k, blob()));
      keys.forEach((k) => releaseLabsObjectUrl(k));
      vi.advanceTimersByTime(LABS_OBJECT_URL_REVOKE_GRACE_MS);
    }
    // Old behaviour: 75 live URLs, each pinning a video blob. Now: none.
    expect(labsObjectUrlLeaseCount()).toBe(0);
    expect(revoked).toHaveLength(75);
  });

  it('releasing an unknown key is a no-op, not a throw', () => {
    expect(() => releaseLabsObjectUrl('never-acquired')).not.toThrow();
  });

  it('does not go negative when released more times than acquired', () => {
    acquireLabsObjectUrl('k', blob());
    releaseLabsObjectUrl('k');
    vi.advanceTimersByTime(LABS_OBJECT_URL_REVOKE_GRACE_MS);
    expect(() => releaseLabsObjectUrl('k')).not.toThrow();
    expect(labsObjectUrlRefCount('k')).toBe(0);
  });
});
