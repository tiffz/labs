import type { ExerciseDefinition, SessionExercise, Stage } from './types';
import { stageClickMode } from './guidedStages';

export function stageToSessionExercise(
  exercise: ExerciseDefinition,
  stage: Stage,
  purpose: SessionExercise['purpose'],
): SessionExercise {
  return {
    exerciseId: exercise.id,
    stageId: stage.id,
    key: exercise.key,
    kind: exercise.kind,
    hand: stage.hand,
    bpm: stage.bpm,
    useMetronome: stage.useMetronome,
    subdivision: stage.subdivision,
    clickMode: stageClickMode(stage),
    mutePlayback: stage.mutePlayback,
    octaves: stage.octaves,
    purpose,
  };
}
