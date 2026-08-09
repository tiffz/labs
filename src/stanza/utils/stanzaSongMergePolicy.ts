import type { StanzaSong } from '../db/stanzaDb';

/**
 * How each `StanzaSong` field crosses a Drive merge.
 *
 * WHY THIS FILE EXISTS
 *
 * `mergeStanzaRicherSongMetadataWithReport` starts from `{ ...local }` and hand-enumerates the
 * fields it resolves. Adding a field to `StanzaSong` and forgetting that list compiles cleanly,
 * serializes cleanly (the envelope uses `Omit<...>` + spread, so the bytes DO reach Drive), and
 * then silently keeps the local value on every device forever. No error, no conflict prompt, no
 * line in the merge report — the user just sees some parts of a song sync and others not.
 *
 * That is what happened to `driveMainMediaBytesFingerprint` and `encoreSongId`.
 *
 * The `satisfies Record<keyof StanzaSong, StanzaSongMergeDisposition>` below turns that silent
 * data bug into a COMPILE error: a new field on `StanzaSong` fails the build until someone
 * classifies it. Encore's `SONG_MERGE_POLICY` / `PERFORMANCE_MERGE_POLICY` use the same guard;
 * Stanza had none, which is why the drift went unnoticed.
 *
 * Behavioural coverage lives in `stanzaSongMergeFieldCoverage.test.ts` — the type guard proves a
 * decision was RECORDED, the test proves the merge body HONORS it.
 */
export type StanzaSongMergeDisposition =
  /** Resolved explicitly in the richer merge (scalar `local ?? remote`, or a dedicated merger). */
  | 'merged'
  /** Never taken from remote, by decision. Every entry must say why below. */
  | 'local-only'
  /** Local bytes; carried across the merge by reference, never serialized to `progress.json`. */
  | 'local-blob';

export const STANZA_SONG_MERGE_POLICY = {
  // --- identity -------------------------------------------------------------------------------
  /** Merge key itself. */
  id: 'local-only',

  /**
   * DELIBERATELY local-only. The YouTube tombstone guard in `stanzaDriveMerge` runs only on the
   * remote-only (`!local && remote`) branch. On the merge branch, local-wins is the ONLY thing
   * stopping a stale remote row from resurrecting a video the user removed. Changing this to
   * `local.ytId ?? remote.ytId` reintroduces that bug — see the regression test.
   */
  ytId: 'local-only',

  // --- merged metadata ------------------------------------------------------------------------
  title: 'merged',
  markers: 'merged',
  stats: 'merged',
  updatedAt: 'merged',
  driveSourceFileId: 'merged',
  /** Encore federation link (ADR 0007). Was unmerged: the link never reached a second device. */
  encoreSongId: 'merged',
  /**
   * Was unmerged, and that caused duplicate Drive files: a device that adopts the remote
   * `driveSourceFileId` but keeps an empty fingerprint decides the bytes still need uploading,
   * re-uploads them, and trashes the other device's file (best-effort, swallowed catch).
   */
  driveMainMediaBytesFingerprint: 'merged',
  localMediaFingerprint: 'merged',
  primaryGain: 'merged',
  primaryMuted: 'merged',
  metronomeBySegmentId: 'merged',
  metronomeSongCalibration: 'merged',
  localTransposeSemitones: 'merged',
  practiceSource: 'merged',
  localOriginalKey: 'merged',
  metronomeTimingScope: 'merged',
  metronomeEnabled: 'merged',
  metronomeGain: 'merged',
  metronomeMuted: 'merged',
  drumsEnabled: 'merged',
  drumPattern: 'merged',
  drumPatternBySegmentId: 'merged',
  drumsGain: 'merged',
  drumsMuted: 'merged',
  skippedBySegmentId: 'merged',
  /** Union of both sides' maps, newest `deletedAt` per id — a delete on either device sticks. */
  deletedMarkerIds: 'merged',

  // --- local-only -----------------------------------------------------------------------------
  /** Device-local Find-the-Beat cache; never synced (ADR 0013). Stripped by the envelope. */
  analysisCache: 'local-only',

  // --- bytes ----------------------------------------------------------------------------------
  /** Main recording bytes; synced separately via `main_audio/`, not `progress.json`. */
  localAudioBlob: 'local-blob',
  /** Derived first-frame preview; regenerated locally rather than synced. */
  localVideoThumbnailBlob: 'local-blob',
  /** Stem bytes; synced separately via `stem_audio/` with their own metadata merge. */
  stems: 'local-blob',
} satisfies Record<keyof StanzaSong, StanzaSongMergeDisposition>;
