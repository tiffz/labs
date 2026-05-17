export type EncoreSongAttachmentKind = 'chart' | 'backing' | 'recording';

/** How the performer accompanied themselves at this show. Free-form multi-select. */
export const ENCORE_ACCOMPANIMENT_TAGS = [
  'Guitar',
  'Violin',
  'Piano',
  'Flute',
  'Drums',
  'Band',
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
  /** When the file lives outside Encore’s canonical folder, shortcut in that folder (optional). */
  encoreShortcutDriveFileId?: string;
  label?: string;
  /** Charts: the default chart for practice links and legacy {@link EncoreSong.sheetMusicDriveFileId} sync. */
  isPrimaryChart?: boolean;
  /**
   * Optional singer notes for this attachment (e.g. "transposed copy", "best take").
   * Surfaced via {@link EncoreAudioResourceNotesWrapper} on the song page so charts and takes
   * have parity with reference/backing media link notes ({@link EncoreMediaLink.notes}).
   */
  notes?: string;
}

export type EncoreMediaSource = 'spotify' | 'youtube' | 'drive';

/** Purpose for YouTube links (karaoke vs performance vs general reference). */
export type EncoreYoutubeMediaKind = 'karaoke' | 'performance' | 'reference' | 'other';

/**
 * A single reference or backing media link (Spotify, YouTube, or Drive audio).
 * Legacy `spotifyTrackId` / `youtubeVideoId` on {@link EncoreSong}: `spotifyTrackId` is the **metadata /
 * playlist data source** (must be Spotify when set). `youtubeVideoId` is synced from the **primary
 * reference** YouTube link when present.
 */
export interface EncoreMediaLink {
  id: string;
  source: EncoreMediaSource;
  spotifyTrackId?: string;
  youtubeVideoId?: string;
  driveFileId?: string;
  /** Shortcut in Encore canonical folder when {@link driveFileId} targets a file elsewhere. */
  encoreShortcutDriveFileId?: string;
  label?: string;
  /** Optional singer notes (e.g. which take to use for auditions). Omitted from public snapshots by default. */
  notes?: string;
  /**
   * Inferred from placement: reference links use `reference`, backing links use `karaoke`.
   * Optional for older rows; do not surface in UI.
   */
  youtubeKind?: EncoreYoutubeMediaKind;
  /** At most one link in {@link EncoreSong.referenceLinks} should be true: your main reference listen. */
  isPrimaryReference?: boolean;
  /** At most one link in {@link EncoreSong.backingLinks} should be true: default backing track. */
  isPrimaryBacking?: boolean;
}

export type EncorePracticeExerciseKind =
  | 'lyricsInOwnWords'
  | 'lyricsSectionNarrative'
  | 'characterNineQuestions';

export type EncorePracticeExerciseStatus = 'draft' | 'completed';

export interface EncorePracticeExerciseRunBase {
  id: string;
  status: EncorePracticeExerciseStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  /**
   * Native Google Doc created by Export → Save to Google Docs; re-sync updates this document.
   * Cleared when the exercise draft is removed.
   */
  drivePracticeExportGoogleDocId?: string;
}

/**
 * A Genius-style section of lyrics (`[Verse 1]`, `[Chorus]`, `[Bridge]`, …). Lines are paired
 * (`original` / `rewrite`) so the editor can render side-by-side without a separate index.
 */
export interface EncoreLyricsExerciseSection {
  /** Genius-style label (e.g. "Verse 1", "Pre-Chorus"). Empty string for unlabeled lines. */
  title: string;
  lines: Array<{ original: string; rewrite: string }>;
}

/** Guided exercise: original lyrics on the left, plain-language rewrite on the right (synced on the song; not in guest snapshots). */
export interface EncoreLyricsInOwnWordsExerciseRun extends EncorePracticeExerciseRunBase {
  kind: 'lyricsInOwnWords';
  /** Optional copy of pasted source for editing or re-parsing. */
  pastedLyrics?: string;
  /**
   * @deprecated Prefer {@link sections}. Older runs created before section parsing landed have
   * only this flat list; the editor normalizes them on read into a single anonymous section.
   */
  lines?: Array<{ original: string; rewrite: string }>;
  /** Sections derived from Genius-style markers. */
  sections?: EncoreLyricsExerciseSection[];
}

/**
 * Guided exercise: for each Genius-style section, describe what is happening in the story (free
 * text). Encourages treating repeated sections (e.g. each chorus) as a new beat in the arc.
 */
export interface EncoreLyricsSectionNarrativeExerciseRun extends EncorePracticeExerciseRunBase {
  kind: 'lyricsSectionNarrative';
  /** One entry per parsed section title (including repeated `[Chorus]` blocks in order). */
  sections: Array<{ title: string; narrative: string }>;
}

/** Guided exercise: nine short character prompts (titles only; no third-party descriptive text). */
export interface EncoreCharacterNineQuestionsExerciseRun extends EncorePracticeExerciseRunBase {
  kind: 'characterNineQuestions';
  /** Same length and order as in-app prompt list. Stored as HTML (TipTap) or legacy plain text. */
  answers: string[];
}

export type EncorePracticeExerciseRun =
  | EncoreLyricsInOwnWordsExerciseRun
  | EncoreLyricsSectionNarrativeExerciseRun
  | EncoreCharacterNineQuestionsExerciseRun;

/** Song stored locally and in repertoire_data.json */
export interface EncoreSong {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  /**
   * Spotify track id used for playlist sync, Fill from Spotify, and album artwork.
   * Independent of which reference recording is marked primary (you may study from a different link).
   */
  spotifyTrackId?: string;
  /** Reference performance / recording on YouTube (from playlist import or manual). */
  youtubeVideoId?: string;
  /** Additional reference media (karaoke, alt recordings, etc.). */
  referenceLinks?: EncoreMediaLink[];
  /** Backing / practice tracks separate from reference listening. */
  backingLinks?: EncoreMediaLink[];
  /** The key you actually perform this song in (manual entry; no auto-fill). */
  performanceKey?: string;
  journalMarkdown: string;
  /**
   * Canonical Genius-style lyrics text for this song (`[Verse 1]`, line breaks, etc.). Shared by
   * lyrics-related practice exercises; edits from an exercise update this field.
   */
  lyricsSourceGenius?: string;
  /**
   * In-app practice exercises for this song (drafts and completed runs). Syncs with your repertoire on Drive.
   * Omitted from {@link PublicSnapshot}.
   */
  practiceExerciseRuns?: EncorePracticeExerciseRun[];
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
  /**
   * Tombstone marker set when the user explicitly stops practicing a song. The Spotify Learning
   * Playlist sync respects this signal: even if the song is still present in the upstream
   * playlist, the import phase will NOT re-set `practicing: true`. Cleared whenever the user
   * affirmatively re-adds the song to practice (via the Add to practice dialog, Library
   * Practicing checkbox, SongPage Practicing switch, or bulk action). Stored as an ISO timestamp
   * so we can surface "stopped on X" in the future if useful, and so the field is naturally
   * comparable / sortable. Omitted from {@link PublicSnapshot}.
   */
  practiceRemovedAt?: string;
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
   * Display name for the guest header ("{name}'s repertoire"). At publish time this is
   * the same as the in-app name: synced override when set, otherwise the Google profile name.
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
      | 'referenceLinks'
      | 'backingLinks'
    >
  >;
  performances: PublicSnapshotPerformance[];
}

/** Persisted Material React Table layout for Encore list screens (synced via repertoire extras). */
export type EncoreMrtTablePrefs = {
  columnVisibility?: Record<string, boolean>;
  columnOrder?: string[];
  sorting?: Array<{ id: string; desc: boolean }>;
};

export type EncoreTableUiBundle = {
  repertoire?: EncoreMrtTablePrefs;
  performances?: EncoreMrtTablePrefs;
};

/** Keys for optional Google Drive folder overrides (new uploads); unset = Encore default folder. */
export type EncoreDriveUploadFolderKind =
  | 'performances'
  | 'charts'
  | 'referenceTracks'
  | 'backingTracks'
  | 'takes';

export type EncoreDriveUploadFolderOverrides = Partial<Record<EncoreDriveUploadFolderKind, string>>;

/** Optional display names for picked folders (Drive metadata); same keys as overrides. */
export type EncoreDriveUploadFolderOverrideLabels = Partial<Record<EncoreDriveUploadFolderKind, string>>;

/**
 * Persisted repertoire list view + optional Spotify playlist binding. Playlist sync uses the filter
 * bundle to choose library tracks to write; imports from Spotify use {@link playlistImportTags} when
 * provided so new rows remain discoverable under the same saved search.
 */
export type EncoreRepertoireSavedSearch = {
  id: string;
  name: string;
  updatedAt: string;
  searchQuery: string;
  visibleFieldIds: string[];
  filterValues: Record<string, string[]>;
  /**
   * Field ids whose `filterValues` selection is treated as **exclude / NOT IN** instead of
   * include / OR. For example, `venue: ['Martuni\'s']` with `excludedFieldIds: ['venue']`
   * means "songs **not** performed at Martuni's". Only multi-select fields opt in (see
   * {@link EncoreFilterFieldConfig['supportsExclude']}); exclusive single-value fields
   * already model is/is-not via their own options.
   */
  excludedFieldIds?: string[];
  spotifyPlaylistId?: string;
  playlistImportTags?: string[];
};

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
  /**
   * Spotify playlist id (not URI) Encore uses for “Currently learning” sync on the Practice page.
   * Stored in `repertoire_data.json` with other extras.
   */
  currentlyLearningSpotifyPlaylistId?: string;
  /**
   * Spotify track ids that were present in the Currently Learning playlist as of the last
   * successful import phase. Used by the next sync to detect Spotify-side removals (ids in this
   * list that are no longer in the playlist) so they can be reflected back into Encore as
   * `practicing: false`. Persisted to Drive so multi-device users share one anchor.
   */
  lastSyncedLearningPlaylistTrackIds?: string[];
  /** Guest snapshot: only songs with at least one logged performance. Not used for saved-search playlist sync. */
  repertoireSpotifySyncPerformedOnly?: boolean;
  /** Named repertoire filter sets; optional Spotify playlist per row for sync. */
  repertoireSavedSearches?: EncoreRepertoireSavedSearch[];
  /** Column visibility, order, and sort for library / performances tables. */
  tableUi?: EncoreTableUiBundle;
  /** Optional Drive folder ids for uploads (bytes); Encore keeps shortcuts under its own `Encore_App` tree. */
  driveUploadFolderOverrides?: EncoreDriveUploadFolderOverrides;
  /** Human-readable folder titles for UI (from Drive); optional. */
  driveUploadFolderOverrideLabels?: EncoreDriveUploadFolderOverrideLabels;
}
