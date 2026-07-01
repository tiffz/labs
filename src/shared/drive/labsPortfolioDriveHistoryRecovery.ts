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

  for (const row of revisionRows.slice(0, maxRevisions)) {
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
