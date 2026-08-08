import type { PracticeItem, SessionExercise } from '../curriculum/types';

/**
 * Free practice and custom routines run on the same generic session runtime as
 * the curriculum, but their exercises are not curriculum rows — they have no
 * stage id and must never be looked up with `findExercise`. To keep them
 * distinct everywhere the runtime keys off `exerciseId` (score id, snapshot
 * identity, and — critically — the "is this the ladder?" guards in the
 * reducer), synthetic ids carry a reserved prefix.
 */
export const FREE_ID_PREFIX = 'free:';

/** True for any exercise id minted for free practice / routine items. */
export function isSyntheticExerciseId(id: string): boolean {
  return id.startsWith(FREE_ID_PREFIX);
}

/**
 * Deterministic exercise id for a practice item: `free:<kind>:<key>`. Stable
 * across sessions so snapshot-resume and routine-item identity survive a
 * refresh. Keys never contain the `:` separator, so this round-trips cleanly.
 */
export function freeExerciseId(item: PracticeItem): string {
  return `${FREE_ID_PREFIX}${item.kind}:${item.key}`;
}

/**
 * Deterministic stage id encoding the parameters that make one drill distinct
 * from another for the same (kind, key). Not a curriculum stage id — purely a
 * stable, human-legible key for the score cache and snapshot.
 */
export function freeStageId(item: PracticeItem): string {
  const useMetronome = item.useMetronome ?? true;
  const clickMode = item.clickMode ?? 'beat';
  const mutePlayback = item.mutePlayback ?? false;
  return [
    item.hand,
    `${item.octaves}oct`,
    `${item.bpm}bpm`,
    item.subdivision,
    useMetronome ? 'metro' : 'free',
    clickMode,
    mutePlayback ? 'muted' : 'guided',
  ].join(':');
}

/**
 * Build a runnable {@link SessionExercise} from a user-chosen {@link PracticeItem}.
 * Fills every field the generic runtime reads (score generation, playback,
 * grading, header chips) from the item, applying the "plain metronome run"
 * defaults for the optional fields. Never consults the curriculum.
 */
export function buildFreeSessionExercise(item: PracticeItem): SessionExercise {
  return {
    exerciseId: freeExerciseId(item),
    stageId: freeStageId(item),
    key: item.key,
    kind: item.kind,
    hand: item.hand,
    bpm: item.bpm,
    useMetronome: item.useMetronome ?? true,
    subdivision: item.subdivision,
    clickMode: item.clickMode ?? 'beat',
    mutePlayback: item.mutePlayback ?? false,
    octaves: item.octaves,
    purpose: 'new',
  };
}
