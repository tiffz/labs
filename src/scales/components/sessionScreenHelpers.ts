import { formatDwellCleanRunsSubline, formatDwellPerfectRunsSubline } from '../progress/store';
import type { RunOutcomeTier } from '../progress/store';
import type { PracticeRecord } from '../progress/types';
import type { SessionExercise } from '../curriculum/types';
import type { ExerciseResult } from '../store';
import { DRILL_TARGET_PERFECT_RUNS } from './sessionScreenConstants';

const NOTE_NAMES = ['C', 'C\u266F', 'D', 'D\u266F', 'E', 'F', 'F\u266F', 'G', 'G\u266F', 'A', 'A\u266F', 'B'];

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
}

export type ExerciseResultBreakdownRow = {
  label: string;
  count: number;
  color: string;
};

/** Non-zero breakdown categories for the post-run summary row. */
export function exerciseResultBreakdownRows(
  breakdown: ExerciseResult['breakdown'],
): ExerciseResultBreakdownRow[] {
  return ([
    ['Perfect', breakdown.perfect, '#10b981'],
    ['Early', breakdown.early, '#3b82f6'],
    ['Late', breakdown.late, '#f59e0b'],
    ['Wrong', breakdown.wrongPitch, '#ef4444'],
    ['Missed', breakdown.missed, '#94a3b8'],
  ] as const)
    .filter(([, count]) => count > 0)
    .map(([label, count, color]) => ({ label, count, color }));
}

export function buildLastRunPracticeRecord(
  lastExerciseResult: ExerciseResult | null,
  activeExercise: SessionExercise,
  exerciseDef: { exercise: { kind: string } } | null,
): PracticeRecord | null {
  if (!lastExerciseResult || !exerciseDef) return null;
  return {
    exerciseId: activeExercise.exerciseId,
    stageId: activeExercise.stageId,
    timestamp: 0,
    accuracy: lastExerciseResult.accuracy,
    noteCount: lastExerciseResult.total,
    correctCount: lastExerciseResult.correct,
    breakdown: lastExerciseResult.breakdown,
  };
}

export type DwellToastCopy = {
  statusBg: 'success.main' | 'warning.main' | 'error.main';
  statusContrast: 'success.contrastText' | 'warning.contrastText' | 'error.contrastText';
  statusHeadlineColor: 'success.main' | 'warning.main' | 'error.main';
  dwellStatusIcon: 'check' | 'schedule' | 'close';
  headline: string;
  subline: string;
};

/** Status chip copy for the auto-loop dwell toast over the score. */
export function computeDwellToastCopy(params: {
  result: ExerciseResult;
  inDrill: boolean;
  wasClean: boolean;
  outcomeTier: RunOutcomeTier;
  streakNumerator: number;
  streakDenominator: number;
  onAdvancementStage: boolean;
}): DwellToastCopy {
  const {
    result,
    inDrill,
    wasClean,
    outcomeTier,
    streakNumerator,
    streakDenominator,
    onAdvancementStage,
  } = params;

  const isPerfect = result.accuracy >= 1;
  const statusOk = inDrill ? isPerfect : wasClean;
  const statusNear = !inDrill && outcomeTier === 'near';
  const statusBg = statusOk ? 'success.main' : statusNear ? 'warning.main' : 'error.main';
  const statusContrast = statusOk
    ? 'success.contrastText'
    : statusNear ? 'warning.contrastText' : 'error.contrastText';
  const statusHeadlineColor = statusOk
    ? 'success.main'
    : statusNear ? 'warning.main' : 'error.main';
  const dwellStatusIcon = statusOk ? 'check' : statusNear ? 'schedule' : 'close';
  const percent = Math.round(result.accuracy * 100);
  const headline = inDrill
    ? (isPerfect ? 'Perfect' : 'Reset')
    : (wasClean ? 'Clean' : statusNear ? 'Almost' : 'Again');
  const subline =
    inDrill
      ? `${percent}% · ${streakNumerator}/${streakDenominator}`
      : streakDenominator > 0
        ? (onAdvancementStage
          ? formatDwellPerfectRunsSubline(
            percent,
            streakNumerator,
            streakDenominator,
            'advancement',
          )
          : formatDwellCleanRunsSubline(
            percent,
            streakNumerator,
            streakDenominator,
            'stage',
          ))
        : `${percent}%`;

  return {
    statusBg,
    statusContrast,
    statusHeadlineColor,
    dwellStatusIcon,
    headline,
    subline,
  };
}

export function dwellStreakDenominator(inDrill: boolean, requiredRuns: number): number {
  return inDrill ? DRILL_TARGET_PERFECT_RUNS : requiredRuns;
}
