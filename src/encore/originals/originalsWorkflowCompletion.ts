import { parseChordProToChartLayout } from '../../shared/music/chordPro/chordChartLayout';
import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import type { EncoreOriginalSong } from './types';
import { ORIGINALS_WORKFLOW_STAGES, type OriginalsWorkflowStage } from './originalsWorkflowStages';

function hasSubstantialLyrics(chordPro: string): boolean {
  const layout = parseChordProToChartLayout(chordPro);
  return layout.sections.some((sec) => sec.lines.some((line) => line.text.trim().length > 0));
}

function hasChordMarkers(chordPro: string): boolean {
  const layout = parseChordProToChartLayout(chordPro);
  return layout.sections.some((sec) => sec.lines.some((line) => line.chords.length > 0));
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

/** First incomplete stage, or the last stage when everything is done. */
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
  const done = ORIGINALS_WORKFLOW_STAGES.filter((s) => isStageComplete(song, s.id)).length;
  return `${done}/${ORIGINALS_WORKFLOW_STAGES.length} stages`;
}
