import type { Key } from '../../shared/music/scoreTypes';
import type { ExerciseKind, Tier, ExerciseDefinition } from './types';
import { buildStages } from './stages';

const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  'major-scale': 'Major Scale',
  'natural-minor-scale': 'Natural Minor Scale',
  'arpeggio-major': 'Major Arpeggio',
  'arpeggio-minor': 'Minor Arpeggio',
};

function exercise(key: Key, kind: ExerciseKind): ExerciseDefinition {
  const id = `${key}-${kind}`;
  return {
    id,
    key,
    kind,
    label: `${key} ${EXERCISE_LABELS[kind]}`,
    stages: buildStages(id),
  };
}

/**
 * Spiral curriculum: each tier introduces a few keys, mixing scales and arpeggios.
 * Keys follow the circle of fifths for pedagogical progression.
 * Arpeggios are introduced in Tier 2 once the student has basic scale fluency.
 */
export const TIERS: Tier[] = [
  {
    id: 'tier-1',
    tierNumber: 1,
    label: 'Foundation',
    description: 'C, G, and F major — the three most common keys',
    exercises: [
      exercise('C', 'major-scale'),
      exercise('G', 'major-scale'),
      exercise('F', 'major-scale'),
    ],
  },
  {
    id: 'tier-2',
    tierNumber: 2,
    label: 'Expanding Range',
    description: 'D and Bb major scales, plus arpeggios for Tier 1 keys',
    exercises: [
      exercise('D', 'major-scale'),
      exercise('Bb', 'major-scale'),
      exercise('C', 'arpeggio-major'),
      exercise('G', 'arpeggio-major'),
      exercise('F', 'arpeggio-major'),
    ],
  },
  {
    id: 'tier-3',
    tierNumber: 3,
    label: 'Minor Keys Begin',
    description: 'A and D natural minor, plus Eb and A major',
    exercises: [
      exercise('A', 'major-scale'),
      exercise('Eb', 'major-scale'),
      exercise('A', 'natural-minor-scale'),
      exercise('D', 'natural-minor-scale'),
      exercise('D', 'arpeggio-major'),
      exercise('Bb', 'arpeggio-major'),
    ],
  },
  {
    id: 'tier-4',
    tierNumber: 4,
    label: 'Sharps & Flats',
    description: 'E, Ab major and their relative minors, plus minor arpeggios',
    exercises: [
      exercise('E', 'major-scale'),
      exercise('Ab', 'major-scale'),
      exercise('E', 'natural-minor-scale'),
      exercise('G', 'natural-minor-scale'),
      exercise('A', 'arpeggio-major'),
      exercise('Eb', 'arpeggio-major'),
      exercise('A', 'arpeggio-minor'),
      exercise('D', 'arpeggio-minor'),
    ],
  },
  {
    id: 'tier-5',
    tierNumber: 5,
    label: 'Advanced Keys',
    description: 'B, Db, F#/Gb major and remaining minor keys',
    exercises: [
      exercise('B', 'major-scale'),
      exercise('Db', 'major-scale'),
      exercise('F#', 'major-scale'),
      exercise('B', 'natural-minor-scale'),
      exercise('C', 'natural-minor-scale'),
      exercise('F', 'natural-minor-scale'),
      exercise('E', 'arpeggio-major'),
      exercise('Ab', 'arpeggio-major'),
      exercise('E', 'arpeggio-minor'),
      exercise('G', 'arpeggio-minor'),
    ],
  },
  {
    id: 'tier-6',
    tierNumber: 6,
    label: 'All Keys Mastery',
    description: 'Remaining minor scales and arpeggios to complete the full set',
    exercises: [
      exercise('Bb', 'natural-minor-scale'),
      exercise('Eb', 'natural-minor-scale'),
      exercise('Ab', 'natural-minor-scale'),
      exercise('B', 'arpeggio-major'),
      exercise('Db', 'arpeggio-major'),
      exercise('F#', 'arpeggio-major'),
      exercise('B', 'arpeggio-minor'),
      exercise('C', 'arpeggio-minor'),
      exercise('F', 'arpeggio-minor'),
      exercise('Bb', 'arpeggio-minor'),
      exercise('Eb', 'arpeggio-minor'),
      exercise('Ab', 'arpeggio-minor'),
    ],
  },
];

export function findExercise(exerciseId: string): { tier: Tier; exercise: ExerciseDefinition } | null {
  for (const tier of TIERS) {
    const ex = tier.exercises.find(e => e.id === exerciseId);
    if (ex) return { tier, exercise: ex };
  }
  return null;
}

export function findStage(exerciseId: string, stageId: string) {
  const found = findExercise(exerciseId);
  if (!found) return null;
  const stage = found.exercise.stages.find(s => s.id === stageId);
  if (!stage) return null;
  return { ...found, stage };
}
