/** Song stored locally and in repertoire_data.json */
export interface EncoreSong {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  spotifyTrackId?: string;
  /** Reference performance / recording on YouTube (from playlist import or manual). */
  youtubeVideoId?: string;
  originalKey?: string;
  originalBpm?: number;
  performanceKey?: string;
  performanceBpm?: number;
  journalMarkdown: string;
  sheetMusicDriveFileId?: string;
  backingTrackDriveFileId?: string;
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
}
