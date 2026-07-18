import { driveListRevisions, type DriveRevisionRow } from './driveFetch';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';

/** Keep this many daily pinned revisions (~1 week of dense overwrite recovery). */
export const LABS_DAILY_PINNED_REVISION_RETENTION = 7;

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function pinStorageKey(fileId: string): string {
  return `labs.drive.dailyPinDay:${fileId}`;
}

function readLastPinnedDay(fileId: string): string | null {
  try {
    return window.localStorage.getItem(pinStorageKey(fileId));
  } catch {
    return null;
  }
}

function writeLastPinnedDay(fileId: string, day: string): void {
  try {
    window.localStorage.setItem(pinStorageKey(fileId), day);
  } catch {
    /* ignore quota */
  }
}

/**
 * Pin (or unpin) a Drive file revision. Pinned revisions survive Drive's automatic pruning
 * (~100 revisions / ~30 days for unpinned binary/JSON uploads).
 */
export async function driveUpdateRevisionKeepForever(
  accessToken: string,
  fileId: string,
  revisionId: string,
  keepForever: boolean,
): Promise<void> {
  const res = await fetch(
    `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}?fields=id,keepForever&supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keepForever }),
    },
  );
  if (res.ok) return;
  // 403/404: scope or already-gone revision — non-fatal for sync success path.
  if (res.status === 403 || res.status === 404) return;
  const text = await res.text();
  throw new Error(`Drive revision pin failed (${res.status}): ${text.slice(0, 200)}`);
}

function sortRevisionsNewestFirst(rows: DriveRevisionRow[]): DriveRevisionRow[] {
  return [...rows].sort((a, b) => {
    const at = a.modifiedTime ?? '';
    const bt = b.modifiedTime ?? '';
    return bt.localeCompare(at);
  });
}

/**
 * Once per UTC day after a successful progress/repertoire write, pin the newest revision
 * (`keepForever`) and unpin pins older than {@link LABS_DAILY_PINNED_REVISION_RETENTION} days.
 * Best-effort: failures never fail the sync write.
 */
export async function maybePinDailyDriveFileRevision(
  accessToken: string,
  fileId: string,
): Promise<{ pinned: boolean; reason: string }> {
  const day = utcDayKey();
  if (readLastPinnedDay(fileId) === day) {
    return { pinned: false, reason: 'already-pinned-today' };
  }

  try {
    const revisions = sortRevisionsNewestFirst(await driveListRevisions(accessToken, fileId));
    const newest = revisions.find((row) => row.id?.trim());
    if (!newest?.id) {
      return { pinned: false, reason: 'no-revision' };
    }

    if (!newest.keepForever) {
      await driveUpdateRevisionKeepForever(accessToken, fileId, newest.id, true);
    }

    const cutoff = Date.now() - LABS_DAILY_PINNED_REVISION_RETENTION * 24 * 60 * 60 * 1000;
    for (const row of revisions) {
      if (!row.id || row.id === newest.id || !row.keepForever) continue;
      const modified = row.modifiedTime ? Date.parse(row.modifiedTime) : NaN;
      if (!Number.isFinite(modified) || modified >= cutoff) continue;
      await driveUpdateRevisionKeepForever(accessToken, fileId, row.id, false);
    }

    writeLastPinnedDay(fileId, day);
    return { pinned: true, reason: 'pinned' };
  } catch {
    return { pinned: false, reason: 'error' };
  }
}
