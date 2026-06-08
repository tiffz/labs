import { FULL_STRUCTURAL_BLUEPRINT } from './originalsStructurePresets';
import { plainOrHtmlToEditorHtml } from '../../shared/utils/richTextContent';
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
  /** TipTap HTML for the brainstorm stage. */
  brainstormHtml?: string;
  /** Uploaded links and reference files for brainstorming. */
  brainstormResources?: EncoreMiscResource[];
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
  createdAt: string;
  updatedAt: string;
}

export const ORIGINALS_DEFAULT_TEMPO = 80;
export const ORIGINALS_HISTORY_MAX = 50;

export function createBlankOriginalSong(now = new Date().toISOString()): EncoreOriginalSong {
  return {
    id: crypto.randomUUID(),
    title: '',
    key: 'C',
    tempo: ORIGINALS_DEFAULT_TEMPO,
    lyricsAndChords: FULL_STRUCTURAL_BLUEPRINT,
    brainstormResources: [],
    takes: [],
    mainTakeId: null,
    history: [],
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
    stageCompletion: song.stageCompletion ?? {},
  };
}

/** Preferred demo take when {@link EncoreOriginalSong.mainTakeId} is set. */
export function preferredOriginalTake(song: EncoreOriginalSong): OriginalAudioTake | null {
  if (!song.mainTakeId) return null;
  return song.takes.find((t) => t.id === song.mainTakeId) ?? null;
}
