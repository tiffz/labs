import type { Stage } from './types';

export type ClickMode = 'beat' | 'subdivision';

/** Resolved click mode — `'beat'` when omitted on legacy stages. */
export function stageClickMode(stage: Stage): ClickMode {
  return stage.clickMode ?? 'beat';
}

/**
 * Guided subdivision scaffold: full click grid, guide playback on, 85% clean-bar gate.
 * Guide-off stages with a subdivision click grid use the perfect-streak path instead.
 */
export function isGuidedSubdivisionStage(stage: Stage): boolean {
  return (
    stage.subdivision !== 'none'
    && stageClickMode(stage) === 'subdivision'
    && !stage.mutePlayback
  );
}

/**
 * Subdivision work on the perfect-streak path: quarter-note clicks only, or a full
 * subdivision grid with guide playback off (e.g. bridge tempo before 72 BPM).
 */
export function isBeatOnlySubdivisionStage(stage: Stage): boolean {
  if (stage.subdivision === 'none') return false;
  if (stageClickMode(stage) === 'beat') return true;
  return stageClickMode(stage) === 'subdivision' && stage.mutePlayback;
}

const BEAT_TO_GUIDED_SUFFIX: readonly [string, string][] = [
  ['-s18', '-s18g'],
  ['-s17', '-s17g'],
  ['-s16', '-s16g'],
  ['-s14', '-s14g'],
  ['-s13', '-s13g'],
  ['-s12', '-s12g'],
  ['-s11m', '-s11mg'],
  ['-s11', '-s11g'],
  ['-s10', '-s10g'],
  ['-s9', '-s9g'],
];

/** Beat-only stage id → guided scaffold id (same exercise prefix). */
export function guidedStageIdForBeatOnly(stageId: string): string | null {
  for (const [beatSuffix, guidedSuffix] of BEAT_TO_GUIDED_SUFFIX) {
    if (stageId.endsWith(beatSuffix)) {
      return `${stageId.slice(0, -beatSuffix.length)}${guidedSuffix}`;
    }
  }
  return null;
}

/** Guided scaffold id → beat-only stage id. */
export function beatOnlyStageIdForGuided(stageId: string): string | null {
  for (const [beatSuffix, guidedSuffix] of BEAT_TO_GUIDED_SUFFIX) {
    if (stageId.endsWith(guidedSuffix)) {
      return `${stageId.slice(0, -guidedSuffix.length)}${beatSuffix}`;
    }
  }
  return null;
}

/**
 * When the learner is on beat-only subdivision work but has not cleared the
 * paired guided stage, route them to the guided scaffold first.
 */
export function redirectCurrentStageToGuidedScaffold(
  stages: readonly Stage[],
  completedStageId: string | null,
  currentStageId: string,
): string {
  const guidedId = guidedStageIdForBeatOnly(currentStageId);
  if (guidedId == null) return currentStageId;

  const guidedIdx = stages.findIndex(s => s.id === guidedId);
  if (guidedIdx < 0) return currentStageId;

  const compIdx = completedStageId != null
    ? stages.findIndex(s => s.id === completedStageId)
    : -1;

  if (compIdx < guidedIdx) return guidedId;
  return currentStageId;
}

/** Prefer guided review when timing was shaky on beat-only subdivision. */
export function reviewStageForSubdivisionShaky(
  stages: readonly Stage[],
  stageId: string,
  reason: 'shaky' | 'stale',
): string {
  if (reason !== 'shaky') return stageId;
  const stage = stages.find(s => s.id === stageId);
  if (!stage || !isBeatOnlySubdivisionStage(stage)) return stageId;
  const guidedId = guidedStageIdForBeatOnly(stageId);
  if (guidedId == null) return stageId;
  return stages.some(s => s.id === guidedId) ? guidedId : stageId;
}
