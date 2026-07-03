import {
  assessLabsDriveBackupConflict,
  labsPortfolioLocalChangedSinceIsoBackup,
  shouldPromptPortfolioMerge,
  type LabsDriveConflictAssessment,
  type LabsDriveConflictReason,
  type LabsPortfolioMergePromptPolicy,
} from '../../shared/drive/labsDriveBackupTypes';
import {
  analyzePortfolioRows,
  labsPortfolioClockFromIso,
  shouldBlockSyncForConflict,
  type LabsPortfolioConflictAnalysis,
  type LabsPortfolioRowClock,
} from '../../shared/drive/labsPortfolioConflictAnalysis';
import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaDriveSyncMeta } from './stanzaDriveSyncMeta';
import type { StanzaDriveEnvelopeV1, StanzaSongDriveRow } from './stanzaDriveEnvelope';
import { mergeStanzaRicherSongMetadata } from '../utils/stanzaSongMetadataMerge';
import { stanzaMarkerCount } from '../utils/stanzaSongCustomizationScore';

export type StanzaDriveConflictReason = LabsDriveConflictReason;
export type StanzaDriveConflictAssessment = LabsDriveConflictAssessment;

/**
 * Stanza uses silent union (ADR 0020). Coarse dialogs are gone; row review only when
 * `analyzeStanzaConflict` reports `needsReview`.
 */
export const STANZA_PORTFOLIO_MERGE_PROMPT_POLICY: LabsPortfolioMergePromptPolicy =
  'silent_union';

export function stanzaLocalMaxUpdatedAtMs(rows: readonly StanzaSong[]): number {
  return rows.reduce((max, row) => Math.max(max, row.updatedAt), 0);
}

export function assessStanzaDriveBackupConflict(params: {
  syncMeta: StanzaDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: StanzaDriveEnvelopeV1 | null;
}): StanzaDriveConflictAssessment {
  const { syncMeta, cloudModifiedTime, remoteEnvelope } = params;
  if (!remoteEnvelope) {
    return { needsPrompt: false, reasons: [] };
  }
  return assessLabsDriveBackupConflict({
    syncMeta,
    cloudModifiedTime,
    remoteExportedAt: remoteEnvelope.exportedAt,
    remoteHasContent: remoteEnvelope.songs.length > 0,
  });
}

/**
 * @deprecated Always false (ADR 0020). Use {@link analyzeStanzaConflict} +
 * {@link shouldBlockSyncForConflict}.
 */
export function shouldPromptStanzaDriveMerge(params: {
  syncMeta: StanzaDriveSyncMeta;
  cloudModifiedTime: string | undefined;
  remoteEnvelope: StanzaDriveEnvelopeV1 | null;
  localRows: readonly StanzaSong[];
}): boolean {
  const assessment = assessStanzaDriveBackupConflict(params);
  return shouldPromptPortfolioMerge({
    policy: STANZA_PORTFOLIO_MERGE_PROMPT_POLICY,
    assessment,
    localChangedSinceLastBackup: labsPortfolioLocalChangedSinceIsoBackup(
      stanzaLocalMaxUpdatedAtMs(params.localRows),
      params.syncMeta.lastBackupExportedAt,
    ),
  });
}

function mapKeyCount(map: Record<string, unknown> | undefined): number {
  return map ? Object.keys(map).length : 0;
}

/**
 * True when auto-merge would drop markers or practice maps that both sides contributed.
 * Stanza's richer merge is usually safe; this is the dry-run gate for `needsReview`.
 */
export function stanzaMergeWouldLoseContent(
  local: StanzaSong,
  remote: StanzaSongDriveRow,
): boolean {
  const merged = mergeStanzaRicherSongMetadata(local, remote);
  const maxMarkers = Math.max(stanzaMarkerCount(local), stanzaMarkerCount(remote));
  if ((merged.markers?.length ?? 0) < maxMarkers) return true;

  const maxMet = Math.max(
    mapKeyCount(local.metronomeBySegmentId as Record<string, unknown> | undefined),
    mapKeyCount(remote.metronomeBySegmentId as Record<string, unknown> | undefined),
  );
  if (mapKeyCount(merged.metronomeBySegmentId as Record<string, unknown> | undefined) < maxMet) {
    return true;
  }

  const maxSkip = Math.max(
    mapKeyCount(local.skippedBySegmentId as Record<string, unknown> | undefined),
    mapKeyCount(remote.skippedBySegmentId as Record<string, unknown> | undefined),
  );
  if (mapKeyCount(merged.skippedBySegmentId as Record<string, unknown> | undefined) < maxSkip) {
    return true;
  }

  return false;
}

function songToClock(song: Pick<StanzaSong, 'id' | 'title' | 'updatedAt'>): LabsPortfolioRowClock {
  return {
    id: song.id,
    updatedAt: song.updatedAt,
    label: song.title,
    kind: 'song',
  };
}

function summarizeStanzaStakes(local: StanzaSong, remote: StanzaSongDriveRow): string {
  const lMarkers = stanzaMarkerCount(local);
  const rMarkers = stanzaMarkerCount(remote);
  return `${lMarkers} section${lMarkers === 1 ? '' : 's'} here · ${rMarkers} on Drive`;
}

/**
 * Row-level conflict analysis for Stanza (ADR 0020).
 * Non-overlapping edits auto-merge; `needsReview` only when dry-run would lose content.
 */
export function analyzeStanzaConflict(params: {
  syncMeta: StanzaDriveSyncMeta;
  localRows: readonly StanzaSong[];
  remoteSongs: readonly StanzaSongDriveRow[];
}): LabsPortfolioConflictAnalysis {
  const { syncMeta, localRows, remoteSongs } = params;
  const lastSyncedLocalMax = labsPortfolioClockFromIso(syncMeta.lastBackupExportedAt);
  const lastRemoteSeen = labsPortfolioClockFromIso(syncMeta.lastCloudModifiedTime);

  const localById = new Map(localRows.map((s) => [s.id, s] as const));
  const remoteById = new Map(remoteSongs.map((s) => [s.id, s] as const));

  return analyzePortfolioRows({
    lastSyncedLocalMax,
    lastRemoteSeen,
    localRows: localRows.map(songToClock),
    remoteRows: remoteSongs.map(songToClock),
    defaultKind: 'song',
    isAutoResolvable: (localClock, remoteClock) => {
      const local = localById.get(localClock.id);
      const remote = remoteById.get(remoteClock.id);
      if (!local || !remote) return true;
      return !stanzaMergeWouldLoseContent(local, remote);
    },
    summarizeStakes: (localClock, remoteClock) => {
      const local = localById.get(localClock.id);
      const remote = remoteById.get(remoteClock.id);
      if (!local || !remote) return undefined;
      return summarizeStanzaStakes(local, remote);
    },
  });
}

export { shouldBlockSyncForConflict };
