import { driveGetRevisionMedia, driveListRevisions } from './driveFetch';

export type PortfolioProgressRevisionSnapshot<TEnvelope> = {
  revisionId: string;
  modifiedTime?: string;
  envelope: TEnvelope;
};

export type ScanPortfolioProgressRevisionsResult<TEnvelope> = {
  snapshots: PortfolioProgressRevisionSnapshot<TEnvelope>[];
  revisionsScanned: number;
  revisionsSkipped: number;
};

/**
 * Scan Google Drive revision history for a portfolio app's `progress.json`.
 * Skips revisions that fail `parseEnvelope` (corrupt / placeholder).
 */
export async function scanPortfolioProgressRevisions<TEnvelope>(
  accessToken: string,
  progressFileId: string,
  parseEnvelope: (json: string) => TEnvelope,
  maxRevisions = 40,
): Promise<ScanPortfolioProgressRevisionsResult<TEnvelope>> {
  const revisionRows = await driveListRevisions(accessToken, progressFileId);
  const snapshots: PortfolioProgressRevisionSnapshot<TEnvelope>[] = [];
  let revisionsSkipped = 0;

  // `driveListRevisions` returns Drive's order (oldest → newest), but recovery must
  // look at the NEWEST revisions: accidental empty overwrites and the daily
  // `keepForever` pins (see `maybePinDailyDriveFileRevision`) both land at the newest
  // end. Slicing oldest-first would structurally miss its own pins on files with more
  // than `maxRevisions` revisions. Sort newest-first before the cap, and always keep
  // pinned revisions regardless of position — the pruner keeps them for recovery.
  const withOrder = revisionRows.map((row, index) => ({ row, index }));
  const newestFirst = [...withOrder].sort((a, b) => {
    const at = a.row.modifiedTime ?? '';
    const bt = b.row.modifiedTime ?? '';
    if (at !== bt) return bt.localeCompare(at);
    // Fall back to Drive's order (later index = newer) when times tie or are absent.
    return b.index - a.index;
  });
  const capped = newestFirst.slice(0, maxRevisions);
  const cappedIds = new Set(capped.map((entry) => entry.row.id));
  const pinnedBeyondCap = newestFirst
    .slice(maxRevisions)
    .filter((entry) => entry.row.keepForever && !cappedIds.has(entry.row.id));
  const rowsToScan = [...capped, ...pinnedBeyondCap].map((entry) => entry.row);

  for (const row of rowsToScan) {
    if (!row.id) continue;
    try {
      const raw = await driveGetRevisionMedia(accessToken, progressFileId, row.id);
      const envelope = parseEnvelope(raw);
      snapshots.push({
        revisionId: row.id,
        modifiedTime: row.modifiedTime,
        envelope,
      });
    } catch {
      revisionsSkipped += 1;
    }
  }

  return {
    snapshots,
    revisionsScanned: snapshots.length,
    revisionsSkipped,
  };
}

export type PortfolioHistoryRecoveryEntry = {
  id: string;
  label: string;
  /** Newest revision modifiedTime that still held this entity. */
  lastSeenModifiedTime?: string;
};

/**
 * Find entity ids that appear in any historical snapshot but not in the current local payload.
 * `listEntityIds` should return stable ids (comic id, pack id, stanza row id, etc.).
 */
export function assessPortfolioHistoryRecovery<TPayload, TEnvelope>(args: {
  current: TPayload;
  snapshots: readonly PortfolioProgressRevisionSnapshot<TEnvelope>[];
  listEntityIds: (payload: TPayload) => string[];
  envelopeToPayload: (envelope: TEnvelope) => TPayload;
  getEntityLabel: (id: string, payload: TPayload) => string | undefined;
}): PortfolioHistoryRecoveryEntry[] {
  const currentIds = new Set(args.listEntityIds(args.current));
  const richest = new Map<string, PortfolioHistoryRecoveryEntry>();

  for (const snap of args.snapshots) {
    const payload = args.envelopeToPayload(snap.envelope);
    for (const id of args.listEntityIds(payload)) {
      if (currentIds.has(id)) continue;
      const label = args.getEntityLabel(id, payload) ?? id;
      const existing = richest.get(id);
      if (!existing) {
        richest.set(id, { id, label, lastSeenModifiedTime: snap.modifiedTime });
        continue;
      }
      const prev = existing.lastSeenModifiedTime ?? '';
      const next = snap.modifiedTime ?? '';
      if (next > prev) {
        richest.set(id, { id, label, lastSeenModifiedTime: snap.modifiedTime });
      }
    }
  }

  return [...richest.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/**
 * Pick the entity slice from the newest revision (by `modifiedTime`) that still holds `id`.
 * Matches {@link assessPortfolioHistoryRecovery}'s "last seen" labeling.
 */
export function pickNewestHistoryEntitySlice<TPayload, TEnvelope>(args: {
  id: string;
  snapshots: readonly PortfolioProgressRevisionSnapshot<TEnvelope>[];
  envelopeToPayload: (envelope: TEnvelope) => TPayload;
  payloadWithEntity: (source: TPayload, id: string) => TPayload | null;
}): TPayload | null {
  let best: { modifiedTime: string; slice: TPayload } | null = null;
  for (const snap of args.snapshots) {
    const payload = args.envelopeToPayload(snap.envelope);
    const slice = args.payloadWithEntity(payload, args.id);
    if (!slice) continue;
    const modifiedTime = snap.modifiedTime ?? '';
    if (!best || modifiedTime > best.modifiedTime) {
      best = { modifiedTime, slice };
    }
  }
  return best?.slice ?? null;
}
