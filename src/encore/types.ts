export type EncoreSongAttachmentKind = 'chart' | 'backing' | 'recording';

/** How the performer accompanied themselves at this show. Free-form multi-select. */
export const ENCORE_ACCOMPANIMENT_TAGS = [
  'Guitar',
  'Violin',
  'Piano',
  'Backing Track',
  'Backing Vocals',
  'Duet partner',
  'Self-accompany',
] as const;
export type EncoreAccompanimentTag = (typeof ENCORE_ACCOMPANIMENT_TAGS)[number];

export type EncoreMilestoneState = 'todo' | 'done' | 'na';

export interface EncoreMilestoneDefinition {
  id: string;
  label: string;
  sortOrder: number;
  /** When true, hidden from new checklists but ids may still exist on songs. */
  archived?: boolean;
}

export interface EncoreSongMilestoneProgress {
  state: EncoreMilestoneState;
  doneAt?: string;
}

/** Milestone row that exists only on this song (not from the global template). */
export interface EncoreSongOnlyMilestone {
  id: string;
  label: string;
  state: EncoreMilestoneState;
  doneAt?: string;
}

/** Optional Drive file attached to a song (charts, backing, practice recordings). */
export interface EncoreSongAttachment {
  kind: EncoreSongAttachmentKind;
  driveFileId: string;
  label?: string;
}

/** Song stored locally and in repertoire_data.json */
export interface EncoreSong {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  spotifyTrackId?: string;
  /** Reference performance / recording on YouTube (from playlist import or manual). */
  youtubeVideoId?: string;
  /** The key you actually perform this song in (manual entry; no auto-fill). */
  performanceKey?: string;
  journalMarkdown: string;
  /** @deprecated Prefer {@link attachments} with kind `chart`; kept for sync and older data. */
  sheetMusicDriveFileId?: string;
  /** @deprecated Prefer {@link attachments} with kind `backing`. */
  backingTrackDriveFileId?: string;
  /** Practice or reference audio files on Drive (ids only). */
  recordingDriveFileIds?: string[];
  /** Structured Drive attachments; legacy id fields are synced on save via {@link songWithSyncedLegacyDriveIds}. */
  attachments?: EncoreSongAttachment[];
  /** True when you are actively working on this song in your rotation (independent of milestone checkboxes). */
  practicing?: boolean;
  /** Progress for global template milestone ids. */
  milestoneProgress?: Record<string, EncoreSongMilestoneProgress>;
  /** Extra checklist rows for this song only. */
  songOnlyMilestones?: EncoreSongOnlyMilestone[];
  /**
   * User-defined free-text tags (e.g. "Pop", "Duet", "Wedding-friendly").
   * Trimmed, deduped case-insensitively at save time. Surfaces in the
   * repertoire table/grid and in the public snapshot.
   */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EncorePerformance {
  id: string;
  songId: string;
  /** ISO date (calendar day) */
  date: string;
  venueTag: string;
  /** Shortcut file id in Drive Performances folder, if created */
  videoShortcutDriveFileId?: string;
  /** Original Drive file id user linked (for re-shortcut) */
  videoTargetDriveFileId?: string;
  /** External URL if not using Drive */
  externalVideoUrl?: string;
  notes?: string;
  /** Multi-select accompaniment chips (e.g. ["Piano", "Self-accompany"]). */
  accompanimentTags?: EncoreAccompanimentTag[];
  createdAt: string;
  updatedAt: string;
}

/** Public-snapshot performance row: only fields safe to share read-only. */
export interface PublicSnapshotPerformance
  extends Pick<EncorePerformance, 'id' | 'songId' | 'date' | 'venueTag' | 'externalVideoUrl' | 'notes'> {
  /**
   * Direct viewer URL to open the performance video. Set ONLY when the underlying
   * video is publicly readable (external links pass through; Drive videos are
   * verified to have an `anyone:reader` permission at publish time).
   */
  videoOpenUrl?: string;
}

/** Subset written to public_snapshot.json */
export interface PublicSnapshot {
  version: 1;
  generatedAt: string;
  /**
   * Display name for the snapshot owner — populates "{name}'s repertoire" in the
   * guest header. Mirrors `RepertoireExtrasRow.ownerDisplayName` at publish time.
   */
  ownerDisplayName?: string;
  songs: Array<
    Pick<
      EncoreSong,
      | 'id'
      | 'title'
      | 'artist'
      | 'albumArtUrl'
      | 'spotifyTrackId'
      | 'youtubeVideoId'
      | 'performanceKey'
      | 'tags'
    >
  >;
  performances: PublicSnapshotPerformance[];
}

export interface RepertoireWirePayload {
  version: 1;
  exportedAt: string;
  songs: EncoreSong[];
  performances: EncorePerformance[];
  /** Saved venue names for autocomplete and bulk import matching (singer gig locations). */
  venueCatalog?: string[];
  /** Global milestone definitions applied to every song (checklist template). */
  milestoneTemplate?: EncoreMilestoneDefinition[];
  /** Owner display name override — surfaces in app header and shared snapshot. */
  ownerDisplayName?: string;
}
