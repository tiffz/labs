import { parseChordProToChartLayout } from '../../shared/music/chordPro/chordChartLayout';
import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { formatShortDate } from '../components/libraryScreenHelpers';
import { calendarDateFromIsoTimestamp } from '../import/guessIsoDateFromFreeText';
import {
  isOriginalDemoReady,
  isStageComplete,
  originalsLibraryStageLabel,
  originalsLibraryStageProgressDetail,
} from './originalsWorkflowCompletion';
import { ORIGINALS_WORKFLOW_STAGES, type OriginalsWorkflowStage } from './originalsWorkflowStages';
import { originalSongStartedDate, type EncoreOriginalSong } from './types';

export type OriginalsDashboardWorkflowStep = {
  id: OriginalsWorkflowStage;
  label: string;
  complete: boolean;
};

export type OriginalsSongDashboardStatus = {
  stageLabel: string;
  stageProgress: string | null;
  demoReady: boolean;
  workflowSteps: OriginalsDashboardWorkflowStep[];
  hasInlineChords: boolean;
  hasChartFile: boolean;
  hasDemoTake: boolean;
  hasBrainstormDoc: boolean;
  startedLabel: string;
  updatedLabel: string;
  startedUsesFallback: boolean;
  /** True when updated calendar day is before started calendar day. */
  updatedBeforeStarted: boolean;
  missingChartFile: boolean;
  missingDemoTake: boolean;
  incompleteWorkflow: boolean;
};

function hasInlineChords(chordPro: string): boolean {
  const layout = parseChordProToChartLayout(chordPro);
  return layout.sections.some((sec) => sec.lines.some((line) => line.chords.length > 0));
}

function isChartReferenceResource(
  resource: NonNullable<EncoreOriginalSong['songReferences']>[number],
): boolean {
  if (resource.kind === 'pdf' || resource.kind === 'google-doc') return true;
  const mime = resource.mimeType?.toLowerCase() ?? '';
  if (mime.includes('pdf') || mime.includes('chord')) return true;
  const label = resource.label.toLowerCase();
  return /\.(pdf|pro|chordpro|txt|md|doc|docx)$/.test(label);
}

export function hasOriginalChartFile(song: EncoreOriginalSong): boolean {
  return (song.songReferences ?? []).some(isChartReferenceResource);
}

export function hasOriginalBrainstormDoc(song: EncoreOriginalSong): boolean {
  return !isRichTextEmpty(song.brainstormHtml) || (song.brainstormResources?.length ?? 0) > 0;
}

export function buildOriginalSongDashboardStatus(song: EncoreOriginalSong): OriginalsSongDashboardStatus {
  const demoReady = isOriginalDemoReady(song);
  const hasInline = hasInlineChords(song.lyricsAndChords);
  const hasChartFile = hasOriginalChartFile(song);
  const hasDemoTake = song.takes.length > 0;
  const hasBrainstormDoc = hasOriginalBrainstormDoc(song);

  const startedIso = originalSongStartedDate(song);
  const startedUsesFallback = !song.startedAt?.trim();
  const updatedCalendar = calendarDateFromIsoTimestamp(song.updatedAt);
  const startedCalendar = startedIso;

  return {
    stageLabel: originalsLibraryStageLabel(song),
    stageProgress: originalsLibraryStageProgressDetail(song),
    demoReady,
    workflowSteps: ORIGINALS_WORKFLOW_STAGES.map((step) => ({
      id: step.id,
      label: step.label,
      complete: isStageComplete(song, step.id),
    })),
    hasInlineChords: hasInline,
    hasChartFile,
    hasDemoTake,
    hasBrainstormDoc,
    startedLabel: formatShortDate(startedIso),
    updatedLabel: formatShortDate(song.updatedAt),
    startedUsesFallback,
    updatedBeforeStarted: updatedCalendar < startedCalendar,
    missingChartFile: !hasChartFile,
    missingDemoTake: !hasDemoTake,
    incompleteWorkflow: !demoReady,
  };
}
