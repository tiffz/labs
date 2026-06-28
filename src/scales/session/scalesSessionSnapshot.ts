import type { SessionExercise, SessionPlan } from '../curriculum/types';
import { findExercise } from '../curriculum/tiers';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import { isCurriculumExerciseUnlocked } from '../curriculum/exerciseUnlock';
import type { ScalesProgressData } from '../progress/types';
import type { PianoScore } from '../../shared/music/scoreTypes';

const STORAGE_KEY = 'scales-session-snapshot';
const SNAPSHOT_VERSION = 1;
/** Drop stale snapshots so an abandoned tab does not resume weeks later. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionSnapshot {
  version: typeof SNAPSHOT_VERSION;
  sessionPlan: SessionPlan;
  activeExerciseIndex: number;
  activeExercise: SessionExercise;
  sessionTierIdAtStart: string | null;
  savedAt: number;
}

export interface RestoredSession {
  sessionPlan: SessionPlan;
  activeExerciseIndex: number;
  activeExercise: SessionExercise;
  score: PianoScore | null;
  sessionTierIdAtStart: string | null;
}

function isSessionExercise(value: unknown): value is SessionExercise {
  if (!value || typeof value !== 'object') return false;
  const ex = value as SessionExercise;
  const clickMode = ex.clickMode ?? 'beat';
  return (
    typeof ex.exerciseId === 'string'
    && typeof ex.stageId === 'string'
    && typeof ex.key === 'string'
    && typeof ex.kind === 'string'
    && (ex.hand === 'right' || ex.hand === 'left' || ex.hand === 'both')
    && typeof ex.bpm === 'number'
    && typeof ex.useMetronome === 'boolean'
    && (clickMode === 'beat' || clickMode === 'subdivision')
    && (ex.purpose === 'new' || ex.purpose === 'review')
  );
}

export function saveSessionSnapshot(args: {
  sessionPlan: SessionPlan;
  activeExerciseIndex: number;
  activeExercise: SessionExercise;
  sessionTierIdAtStart: string | null;
}): void {
  try {
    const payload: SessionSnapshot = {
      version: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      ...args,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage full / private mode */
  }
}

export function clearSessionSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSessionSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (parsed.version !== SNAPSHOT_VERSION) return null;
    if (!Array.isArray(parsed.sessionPlan?.exercises) || parsed.sessionPlan.exercises.length === 0) {
      return null;
    }
    if (!isSessionExercise(parsed.activeExercise)) return null;
    if (typeof parsed.activeExerciseIndex !== 'number') return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function validateSessionSnapshot(
  snapshot: SessionSnapshot,
  progress: ScalesProgressData,
): boolean {
  const { activeExercise, activeExerciseIndex, sessionPlan } = snapshot;
  if (activeExerciseIndex < 0 || activeExerciseIndex >= sessionPlan.exercises.length) {
    return false;
  }
  if (!isCurriculumExerciseUnlocked(progress, activeExercise.exerciseId)) return false;

  const activeFound = findExercise(activeExercise.exerciseId);
  if (!activeFound) return false;
  if (!activeFound.exercise.stages.some(s => s.id === activeExercise.stageId)) return false;

  for (const slot of sessionPlan.exercises) {
    if (!isSessionExercise(slot)) return false;
    const found = findExercise(slot.exerciseId);
    if (!found) return false;
    if (!found.exercise.stages.some(s => s.id === slot.stageId)) return false;
  }
  return true;
}

/** Restore an in-progress session after refresh, or null if none / invalid. */
export function restoreSessionFromSnapshot(progress: ScalesProgressData): RestoredSession | null {
  const snapshot = loadSessionSnapshot();
  if (!snapshot) return null;
  if (!validateSessionSnapshot(snapshot, progress)) {
    clearSessionSnapshot();
    return null;
  }
  const score = generateScoreForExercise(snapshot.activeExercise);
  if (!score) {
    clearSessionSnapshot();
    return null;
  }
  return {
    sessionPlan: snapshot.sessionPlan,
    activeExerciseIndex: snapshot.activeExerciseIndex,
    activeExercise: snapshot.activeExercise,
    score,
    sessionTierIdAtStart: snapshot.sessionTierIdAtStart,
  };
}
