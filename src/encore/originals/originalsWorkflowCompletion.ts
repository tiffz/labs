import { parseChordProToChartLayout } from '../../shared/music/chordPro/chordChartLayout';
import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import type { EncoreOriginalSong } from './types';
import { FULL_STRUCTURAL_BLUEPRINT } from './originalsStructurePresets';
import { ORIGINALS_WORKFLOW_STAGES, type OriginalsWorkflowStage, workflowStageShortLabel } from './originalsWorkflowStages';

function hasSubstantialLyrics(chordPro: string): boolean {
  const layout = parseChordProToChartLayout(chordPro);
  return layout.sections.some((sec) => sec.lines.some((line) => line.text.trim().length > 0));
}

function hasChordMarkers(chordPro: string): boolean {
  const layout = parseChordProToChartLayout(chordPro);
  return layout.sections.some((sec) => sec.lines.some((line) => line.chords.length > 0));
}

/** Whether a new original has enough user content to write to Dexie / Drive. Existing rows always persist. */
export function isOriginalSongPersistable(
  song: EncoreOriginalSong,
  previous?: EncoreOriginalSong | null,
): boolean {
  if (previous) return true;
  if (song.title.trim()) return true;
  if (!isRichTextEmpty(song.brainstormHtml)) return true;
  if ((song.brainstormResources?.length ?? 0) > 0) return true;
  if ((song.songReferences?.length ?? 0) > 0) return true;
  if (song.takes.length > 0) return true;
  if (song.history.length > 0) return true;
  if (hasSubstantialLyrics(song.lyricsAndChords)) return true;
  if (hasChordMarkers(song.lyricsAndChords)) return true;
  if (song.lyricsAndChords.trim() !== FULL_STRUCTURAL_BLUEPRINT.trim()) return true;
  return false;
}

/** Heuristic completion when the user has not manually marked a stage. */
export function isStageHeuristicallyComplete(song: EncoreOriginalSong, stage: OriginalsWorkflowStage): boolean {
  switch (stage) {
    case 'brainstorm':
      return !isRichTextEmpty(song.brainstormHtml) || (song.brainstormResources?.length ?? 0) > 0;
    case 'write':
      return hasSubstantialLyrics(song.lyricsAndChords);
    case 'chords':
      return hasChordMarkers(song.lyricsAndChords);
    case 'takes':
      return song.takes.length > 0;
  }
}

export function isStageComplete(song: EncoreOriginalSong, stage: OriginalsWorkflowStage): boolean {
  const manual = song.stageCompletion?.[stage];
  if (manual !== undefined) return manual;
  return isStageHeuristicallyComplete(song, stage);
}

/** All workflow stages complete — song has lyrics, chords, and at least one demo take. */
export function isOriginalDemoReady(song: EncoreOriginalSong): boolean {
  return ORIGINALS_WORKFLOW_STAGES.every((step) => isStageComplete(song, step.id));
}

/** First incomplete stage, or `takes` when everything is done (use {@link isOriginalDemoReady} for display). */
export function inferredWorkflowStage(song: EncoreOriginalSong): OriginalsWorkflowStage {
  for (const step of ORIGINALS_WORKFLOW_STAGES) {
    if (!isStageComplete(song, step.id)) return step.id;
  }
  return 'takes';
}

export function toggleStageCompletion(
  song: EncoreOriginalSong,
  stage: OriginalsWorkflowStage,
): EncoreOriginalSong {
  const current = isStageComplete(song, stage);
  return {
    ...song,
    stageCompletion: {
      ...song.stageCompletion,
      [stage]: !current,
    },
  };
}

export function formatOriginalStageSummary(song: EncoreOriginalSong): string {
  if (isOriginalDemoReady(song)) return 'Demo ready';
  const done = ORIGINALS_WORKFLOW_STAGES.filter((s) => isStageComplete(song, s.id)).length;
  return `${done}/${ORIGINALS_WORKFLOW_STAGES.length} stages`;
}

/** Stage label for library surfaces — current in-progress step, or Demo ready when complete. */
export function originalsLibraryStageLabel(song: EncoreOriginalSong): string {
  if (isOriginalDemoReady(song)) return 'Demo ready';
  return workflowStageShortLabel(inferredWorkflowStage(song));
}

/** Secondary progress line for library stage column (`3/4 stages`), or null when demo-ready. */
export function originalsLibraryStageProgressDetail(song: EncoreOriginalSong): string | null {
  if (isOriginalDemoReady(song)) return null;
  return formatOriginalStageSummary(song);
}

export function originalsLibraryStageSortKey(song: EncoreOriginalSong): number {
  return ORIGINALS_WORKFLOW_STAGES.filter((s) => isStageComplete(song, s.id)).length;
}
