import Dexie, { type Table } from 'dexie';

export interface StanzaMarker {
  /** Stable key for segment ids and drag; assigned on save if missing. */
  id?: string;
  time: number;
  label: string;
}

export interface SegmentStat {
  totalMs: number;
  lastPracticed: number;
}

export interface StanzaSong {
  id: string;
  ytId: string | null;
  title: string;
  markers: StanzaMarker[];
  stats: Record<string, SegmentStat>;
  updatedAt: number;
  /** When the row was created from Encore “Practice in Stanza” (`?df=`) or a future Drive picker. */
  driveSourceFileId?: string;
  /** Local file backing when `ytId` is null */
  localAudioBlob?: Blob;
  /** First-frame JPEG preview for {@link localAudioBlob} video types (library grid). */
  localVideoThumbnailBlob?: Blob;
  metronomeBpm?: number;
  /** Media-time seconds of first downbeat for click alignment */
  metronomeAnchorMediaTime?: number;
  metronomeEnabled?: boolean;
}

export interface StanzaTake {
  id: string;
  songId: string;
  segmentId: string;
  blob: Blob;
  isGuided: boolean;
  createdAt: number;
}

export class StanzaDB extends Dexie {
  songs!: Table<StanzaSong, string>;
  takes!: Table<StanzaTake, string>;

  constructor() {
    super('stanza-practice');
    this.version(1).stores({
      songs: 'id, updatedAt, title, ytId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
    this.version(2).stores({
      songs: 'id, updatedAt, title, ytId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
    this.version(3).stores({
      songs: 'id, updatedAt, title, ytId, driveSourceFileId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
    this.version(4).stores({
      songs: 'id, updatedAt, title, ytId, driveSourceFileId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
  }
}

export const stanzaDb = new StanzaDB();
