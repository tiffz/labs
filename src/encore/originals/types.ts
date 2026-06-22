import { FULL_STRUCTURAL_BLUEPRINT } from './originalsStructurePresets';
import { plainOrHtmlToEditorHtml } from '../../shared/utils/richTextContent';
import { calendarDateFromIsoTimestamp } from '../import/guessIsoDateFromFreeText';
import { DEFAULT_TIME_SIGNATURE, normalizeTimeSignature } from '../../shared/music/timeSignaturePresets';
import type { TimeSignature } from '../../shared/rhythm/types';
import type { EncoreMiscResource } from '../types';
import type { OriginalsWorkflowStage } from './originalsWorkflowStages';

/** Brainstorm reference links and files — same shape as repertoire misc practice resources. */
export type OriginalBrainstormResource = EncoreMiscResource;

/** Manual stage completion flags; unset stages fall back to heuristics. */
export type OriginalsStageCompletion = Partial<Record<OriginalsWorkflowStage, boolean>>;

export interface OriginalAudioTake {
  id: string;
  label: string;
  /** Epoch ms when the take was captured or imported. */
  timestamp: number;
  source: 'recorded' | 'imported';
  /** Google Drive file id for the audio blob under `Encore_App/Originals/audio/`. */
  driveFileId?: string;
  /** True when bytes are cached locally in IndexedDB (playable even before / without Drive). */
  hasLocalAudio?: boolean;
  mimeType?: string;
  /** Optional notes (same idea as practice resource notes). */
  notes?: string;
}

/** Local-only chord chart snapshot (idle capture). */
export interface OriginalSongSnapshot {
  timestamp: number;
  lyricsAndChords: string;
}

/**
 * Songwriter original — separate from repertoire {@link EncoreSong}.
 * Timestamps are ISO strings (Labs convention).
 */
export interface EncoreOriginalSong {
  id: string;
  title: string;
  key: string;
  tempo: number;
  /** Meter for chart playback, export, and Words handoff (defaults to 4/4). */
  timeSignature?: TimeSignature;
  /** TipTap HTML for the brainstorm stage. */
  brainstormHtml?: string;
  /** Uploaded links and reference files for brainstorming. */
  brainstormResources?: EncoreMiscResource[];
  /** Charts, PDFs, and other reference files for writing and recording. */
  songReferences?: EncoreMiscResource[];
  /** Inline ChordPro, e.g. `[Fm]I'm not like [Bb]you`. */
  lyricsAndChords: string;
  takes: OriginalAudioTake[];
  mainTakeId: string | null;
  /** Optional manual overrides for workflow stage completion. */
  stageCompletion?: OriginalsStageCompletion;
  /** Cached Google Doc id for exported chord chart (drive.file scope). */
  driveChartGoogleDocId?: string;
  /** Local idle snapshots; not synced to Drive individually. */
  history: OriginalSongSnapshot[];
  /**
   * Per-section chord progression overrides (section header label → ChordPro fragment).
   * When absent, matching section types inherit the first section's progression visually.
   */
  sectionProgressionOverrides?: Record<string, string>;
  /**
   * Local calendar day (YYYY-MM-DD) when songwriting began — may predate {@link EncoreOriginalSong.createdAt}.
   * When unset, UI falls back to the date the song was added to Encore.
   */
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Effective started-writing date for display and sorting. */
export function originalSongStartedDate(song: EncoreOriginalSong): string {
  const explicit = song.startedAt?.trim();
  if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return calendarDateFromIsoTimestamp(song.createdAt);
}

export const ORIGINALS_DEFAULT_TEMPO = 80;
export const ORIGINALS_DEFAULT_TIME_SIGNATURE = DEFAULT_TIME_SIGNATURE;
export const ORIGINALS_HISTORY_MAX = 50;

export function originalSongTimeSignature(song: EncoreOriginalSong): TimeSignature {
  return normalizeTimeSignature(song.timeSignature);
}

export function createBlankOriginalSong(now = new Date().toISOString()): EncoreOriginalSong {
  return {
    id: crypto.randomUUID(),
    title: '',
    key: 'C',
    tempo: ORIGINALS_DEFAULT_TEMPO,
    timeSignature: { ...ORIGINALS_DEFAULT_TIME_SIGNATURE },
    lyricsAndChords: FULL_STRUCTURAL_BLUEPRINT,
    brainstormResources: [],
    songReferences: [],
    takes: [],
    mainTakeId: null,
    history: [],
    startedAt: calendarDateFromIsoTimestamp(now),
    createdAt: now,
    updatedAt: now,
  };
}

type LegacyOriginalRow = EncoreOriginalSong & {
  tags?: string[];
  status?: string;
  brainstormMarkdown?: string;
  driveBrainstormGoogleDocId?: string;
};

/** Drop legacy fields when reading older Drive/IndexedDB rows. */
export function normalizeEncoreOriginalSong(raw: LegacyOriginalRow): EncoreOriginalSong {
  const {
    tags: _tags,
    status: _status,
    brainstormMarkdown,
    driveBrainstormGoogleDocId: _docId,
    ...song
  } = raw;
  void _tags;
  void _status;
  void _docId;

  let brainstormHtml = song.brainstormHtml;
  if (!brainstormHtml?.trim() && brainstormMarkdown?.trim()) {
    brainstormHtml = plainOrHtmlToEditorHtml(brainstormMarkdown);
  }

  return {
    ...song,
    brainstormHtml: brainstormHtml || undefined,
    brainstormResources: song.brainstormResources ?? [],
    songReferences: song.songReferences ?? [],
    stageCompletion: song.stageCompletion ?? {},
    timeSignature: normalizeTimeSignature(song.timeSignature),
  };
}

/** Preferred demo take — main take when set, otherwise the first recorded take. */
export function preferredOriginalTake(song: EncoreOriginalSong): OriginalAudioTake | null {
  if (song.takes.length === 0) return null;
  if (song.mainTakeId) {
    const main = song.takes.find((t) => t.id === song.mainTakeId);
    if (main) return main;
  }
  return song.takes[0] ?? null;
}

/** Synchronous check for Drive id or persisted local-audio flag (IndexedDB probe is async). */
export function originalTakeHasPlayableSource(take: OriginalAudioTake): boolean {
  return Boolean(take.driveFileId?.trim()) || take.hasLocalAudio === true;
}
