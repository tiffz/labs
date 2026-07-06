/**
 * Stanza practice overlay sidecar schema (ADR 0007 revision Option B).
 * Not wired to Drive sync yet — scaffolding for federated Encore + Stanza model.
 * See docs/adr/0007-revision-stanza-encore-federated-sync.md
 */

import type { StanzaSongDriveRow } from './stanzaDriveEnvelope';

export const STANZA_PRACTICE_OVERLAY_SCHEMA_VERSION = 1 as const;

/** Sidecar under `Encore_App/` (ADR 0007 revision Option B). Not wired to sync until migration. */
export const STANZA_PRACTICE_OVERLAY_FILE_NAME = 'stanza_practice_overlay.json';

/** Key: EncoreSong.id when linked, else `drive:${driveSourceFileId}` or `yt:${ytId}`. */
export type StanzaPracticeOverlayKey = string;

export type StanzaPracticeOverlayEntry = Pick<
  StanzaSongDriveRow,
  | 'markers'
  | 'stats'
  | 'primaryGain'
  | 'primaryMuted'
  | 'metronomeBySegmentId'
  | 'metronomeSongCalibration'
  | 'metronomeTimingScope'
  | 'metronomeEnabled'
  | 'metronomeGain'
  | 'metronomeMuted'
  | 'drumsEnabled'
  | 'drumPattern'
  | 'drumPatternBySegmentId'
  | 'drumsGain'
  | 'drumsMuted'
  | 'localTransposeSemitones'
  | 'localOriginalKey'
  | 'skippedBySegmentId'
  | 'stems'
  | 'updatedAt'
> & {
  /** Optional link back to Encore repertoire row when known. */
  encoreSongId?: string;
  driveSourceFileId?: string;
  ytId?: string | null;
};

export type StanzaPracticeOverlayV1 = {
  schemaVersion: typeof STANZA_PRACTICE_OVERLAY_SCHEMA_VERSION;
  exportedAt: string;
  entries: Record<StanzaPracticeOverlayKey, StanzaPracticeOverlayEntry>;
  deletedDriveSourceFileIds?: string[];
};

export function emptyStanzaPracticeOverlayV1(exportedAt = new Date().toISOString()): StanzaPracticeOverlayV1 {
  return {
    schemaVersion: STANZA_PRACTICE_OVERLAY_SCHEMA_VERSION,
    exportedAt,
    entries: {},
    deletedDriveSourceFileIds: [],
  };
}

/** Type guard for parse paths once overlay sync is implemented. */
export function isStanzaPracticeOverlayV1(value: unknown): value is StanzaPracticeOverlayV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as StanzaPracticeOverlayV1;
  return v.schemaVersion === STANZA_PRACTICE_OVERLAY_SCHEMA_VERSION && typeof v.exportedAt === 'string';
}
