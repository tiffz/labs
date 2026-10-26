/**
 * Projects whose Drive package is newer than what this device has applied.
 *
 * The gallery merge stamps the newest clock onto each local project row, so by the time the
 * package download runs, the local clock no longer says whether this device holds the remote
 * content. The merge records the gap here instead, and only a successful package apply clears it,
 * so a failed download is retried on the next sync rather than forgotten.
 */
const STORAGE_KEY = 'labs_lyrefly_pending_package_pulls_v1';

function read(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function write(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage full or blocked: the next merge records the gap again */
  }
}

export function markLyreflyPackagePullPending(projectId: string): void {
  const ids = read();
  if (ids.has(projectId)) return;
  ids.add(projectId);
  write(ids);
}

export function isLyreflyPackagePullPending(projectId: string): boolean {
  return read().has(projectId);
}

export function clearLyreflyPackagePullPending(projectId: string): void {
  const ids = read();
  if (!ids.delete(projectId)) return;
  write(ids);
}

const BACKFILL_KEY = 'labs_lyrefly_pending_package_pulls_backfill_v1';

/**
 * Before pending pulls existed, a device that already held a comic skipped every later remote
 * edit to it. Mark every synced comic pending once so those missed edits are merged in; each mark
 * clears as its package applies, so a failed download is still retried.
 */
export function backfillLyreflyPackagePullsOnce(projectIds: readonly string[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(BACKFILL_KEY)) return;
    const ids = read();
    for (const id of projectIds) ids.add(id);
    write(ids);
    window.localStorage.setItem(BACKFILL_KEY, new Date().toISOString());
  } catch {
    /* storage blocked: retry the backfill on the next sync */
  }
}
