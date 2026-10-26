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

/** A stage's own completion — its manual flag if set, else its content heuristic. */
export function isStageCompleteRaw(song: EncoreOriginalSong, stage: OriginalsWorkflowStage): boolean {
  const manual = song.stageCompletion?.[stage];
  if (manual !== undefined) return manual;
  return isStageHeuristicallyComplete(song, stage);
}

export function isStageComplete(song: EncoreOriginalSong, stage: OriginalsWorkflowStage): boolean {
  // Completion is monotonic: reaching (or marking) any later stage implies the earlier
  // ones are done. So a stage counts complete if it — or any stage after it — is complete
  // on its own. Without this the stepper shows "brainstorm incomplete" while you're already
  // writing lyrics, which reads as inconsistent.
  const startIndex = ORIGINALS_WORKFLOW_STAGES.findIndex((step) => step.id === stage);
  if (startIndex === -1) return isStageCompleteRaw(song, stage);
  for (let i = startIndex; i < ORIGINALS_WORKFLOW_STAGES.length; i += 1) {
    if (isStageCompleteRaw(song, ORIGINALS_WORKFLOW_STAGES[i].id)) return true;
  }
  return false;
}

/**
 * Demo ready = the song has a take. The owner's rule (October 2026): "I recorded a demo, so it's
 * demo ready."
 *
 * The other stages are progress markers, never blockers. Requiring all four raw stages left songs
 * with takes stuck short of "Demo ready" for reasons that did not matter: no brainstorm notes,
 * chords kept in a PDF chart instead of inline, or an instrumental with no lyrics at all. An earlier
 * version deliberately refused "a take alone"; that is now the intended behaviour, by the owner's
 * decision, not a leak of the monotonic stepper rule.
 *
 * Reads the takes stage RAW, so a song whose takes stage was manually marked not-done stays not
 * ready, and the manual flag keeps its meaning.
 */
export function isOriginalDemoReady(song: EncoreOriginalSong): boolean {
  return isStageCompleteRaw(song, 'takes');
}

/** First incomplete stage, or `takes` when the song is demo ready (use {@link isOriginalDemoReady} for display). */
export function inferredWorkflowStage(song: EncoreOriginalSong): OriginalsWorkflowStage {
  for (const step of ORIGINALS_WORKFLOW_STAGES) {
    if (!isStageComplete(song, step.id)) return step.id;
  }

  // Every stage done in stepper terms means the takes stage is done: that is demo ready.
  return 'takes';
}

export function toggleStageCompletion(
  song: EncoreOriginalSong,
  stage: OriginalsWorkflowStage,
): EncoreOriginalSong {
  const current = isStageCompleteRaw(song, stage);
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
  /*
   * Raw, not monotonic, so this agrees with the stage label beside it. With the monotonic count a
   * song holding one take reported "4/4 stages" while refusing to say "Demo ready" — a direct
   * contradiction in the same table row.
   */
  const done = ORIGINALS_WORKFLOW_STAGES.filter((s) => isStageCompleteRaw(song, s.id)).length;
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
