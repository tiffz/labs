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

export type StanzaSegmentMetronomeSource = 'tap' | 'analysis';

/** Whether the tempo rail edits whole-song timing vs the selected section. */
export type StanzaMetronomeTimingScope = 'song' | 'section';

export interface StanzaSegmentMetronomeCalibration {
  bpm: number;
  /** Media-time seconds of a beat phase reference for click alignment. */
  anchorMediaTime: number;
  /**
   * Seconds from this section’s start to the first downbeat (“1”) the metronome aligns to.
   * When set, phase follows the section boundary; {@link anchorMediaTime} should equal section start + this offset on save.
   */
  firstBeatOffsetSec?: number;
  source: StanzaSegmentMetronomeSource;
  /** Present when `source === 'analysis'` (0–1). */
  confidence?: number;
  analyzedAt?: number;
}

/** Optional extra audio layers (e.g. instrumental) mixed with the primary local/Drive blob. See ADR 0003. */
export interface StanzaStemTrack {
  id: string;
  label: string;
  localBlob: Blob;
  muted?: boolean;
  /** Linear gain 0–1 (default 1). */
  gain?: number;
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
  /** Extra stems (local-only bytes; not included in Drive metadata backup). */
  stems?: StanzaStemTrack[];
  /** Main local/Drive file level 0–1 (default 1). Ignored for YouTube. */
  primaryGain?: number;
  /** Mute the main file only; stems follow their own mutes. */
  primaryMuted?: boolean;
  /** Per-section metronome calibration keyed by stable segment ids from `deriveSegments`. */
  metronomeBySegmentId?: Record<string, StanzaSegmentMetronomeCalibration>;
  /** Whole-song metronome grid (beat 1 relative to media t = 0). Sections inherit until overridden. */
  metronomeSongCalibration?: StanzaSegmentMetronomeCalibration;
  /** User pitch shift for uploaded audio only (−12…+12 semitones); uses decoded-buffer detune (main + stems when layered). */
  localTransposeSemitones?: number;
  /** Which timing target the Practice rail is editing (default: song; see ADR 0008). */
  metronomeTimingScope?: StanzaMetronomeTimingScope;
  /** User preference: attempt synced clicks while playing (requires tempo calibration). */
  metronomeEnabled?: boolean;
  /**
   * Linear metronome click level 0–1 (default 1). Multiplies the engine's downbeat/off-beat ratio
   * (see {@link useStanzaMetronomeSync}); this is the user-facing "Metronome" Mix slider.
   */
  metronomeGain?: number;
  /** Mute the metronome from the Mix without disabling its calibration. */
  metronomeMuted?: boolean;
  /**
   * "Add drums" master switch (see ADR 0009). When true, the drums panel renders below the
   * metronome strip; the user picks a pattern there (preset or custom mini-notation), but the
   * pattern selection itself is not persisted — restart of the song reopens with the default,
   * matching the Beat Finder UX.
   */
  drumsEnabled?: boolean;
  /** Linear drums level 0–1 (default 0.7). Global only. */
  drumsGain?: number;
  /**
   * Sections the user marked to skip during forward playback (e.g. instrumental breaks while
   * practicing vocals). Keyed by stable segment id from `deriveSegments`. Crossing into a
   * skipped section auto-advances to the next non-skipped start; manual scrubs are unaffected.
   */
  skippedBySegmentId?: Record<string, true>;
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
    this.version(5).stores({
      songs: 'id, updatedAt, title, ytId, driveSourceFileId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
    this.version(6).stores({
      songs: 'id, updatedAt, title, ytId, driveSourceFileId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
    this.version(7).stores({
      songs: 'id, updatedAt, title, ytId, driveSourceFileId',
      takes: 'id, songId, segmentId, createdAt, isGuided',
    });
  }
}

export const stanzaDb = new StanzaDB();
