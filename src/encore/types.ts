export type EncoreSongAttachmentKind = 'chart' | 'backing' | 'recording';

/** How the performer accompanied themselves at this show (singer-first product; keys are common). */
export type EncoreAccompanimentKind = 'vocal_only' | 'self_accompanied_keys' | 'other' | 'unknown';

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
  /**
   * Genres from Spotify’s **artist** metadata (union of credited artists), not a separate per-track genre.
   * Filled on playlist import, “Refresh from Spotify”, or when resolving a track link.
   */
  spotifyGenres?: string[];
  /** Reference performance / recording on YouTube (from playlist import or manual). */
  youtubeVideoId?: string;
  originalKey?: string;
  originalBpm?: number;
  performanceKey?: string;
  performanceBpm?: number;
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
  /** How you accompanied yourself at this performance (for filtering and history). */
  accompanimentKind?: EncoreAccompanimentKind;
  createdAt: string;
  updatedAt: string;
}

/** Subset written to public_snapshot.json */
export interface PublicSnapshot {
  version: 1;
  generatedAt: string;
  songs: Array<
    Pick<
      EncoreSong,
      | 'id'
      | 'title'
      | 'artist'
      | 'albumArtUrl'
      | 'spotifyTrackId'
      | 'spotifyGenres'
      | 'youtubeVideoId'
      | 'originalKey'
      | 'originalBpm'
      | 'performanceKey'
      | 'performanceBpm'
    >
  >;
  performances: Array<
    Pick<EncorePerformance, 'id' | 'songId' | 'date' | 'venueTag' | 'externalVideoUrl' | 'notes'>
  >;
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
}
