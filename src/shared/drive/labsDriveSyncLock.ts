/**
 * Cross-tab mutual exclusion for Drive sync critical sections (pull/merge/push).
 * Two tabs of the same app syncing concurrently can interleave read-merge-write
 * and resurrect deleted rows or drop a push (documented race in
 * docs/LOCAL_FIRST_SYNC.md). One tab holds the lock; others wait.
 */

/** Keys currently held by this tab — Web Locks are not reentrant, and the
 * 412 retry path (flush → pull → flush) nests sync sections. */
const heldByThisTab = new Set<string>();

export async function withLabsDriveSyncLock<T>(appKey: string, fn: () => Promise<T>): Promise<T> {
  const lockName = `labs_drive_sync_${appKey}`;
  if (
    heldByThisTab.has(lockName) ||
    typeof navigator === 'undefined' ||
    !navigator.locks
  ) {
    return fn();
  }
  return navigator.locks.request(lockName, async () => {
    heldByThisTab.add(lockName);
    try {
      return await fn();
    } finally {
      heldByThisTab.delete(lockName);
    }
  });
}
