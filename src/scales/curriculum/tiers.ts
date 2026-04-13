import type { Key } from '../../shared/music/scoreTypes';
import type { ExerciseKind, Tier, ExerciseDefinition } from './types';
import { buildStages } from './stages';

const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  'major-scale': 'Major Scale',
  'natural-minor-scale': 'Natural Minor Scale',
  'arpeggio-major': 'Major Arpeggio',
  'arpeggio-minor': 'Minor Arpeggio',
};

function exercise(
  key: Key,
  kind: ExerciseKind,
  opts?: Pick<ExerciseDefinition, 'guidance' | 'helpUrl'>,
): ExerciseDefinition {
  const id = `${key}-${kind}`;
  return {
    id,
    key,
    kind,
    label: `${key} ${EXERCISE_LABELS[kind]}`,
    stages: buildStages(id),
    ...opts,
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
      exercise('C', 'major-scale', {
        guidance: {
          right: 'Watch for the thumb crossing on the 4th note (F). Tuck your thumb smoothly under fingers 2\u20133, keeping your wrist level.',
          left: 'The left hand uses the same finger pattern as the right hand, but reversed. The thumb crossing happens at a different point in the scale.',
          both: 'Both hands play the same notes in different octaves. The thumb crossings happen at different points in each hand.',
        },
        helpUrl: 'https://www.youtube.com/results?search_query=how+to+play+C+major+scale+piano+finger+crossing',
      }),
      exercise('G', 'major-scale', {
        guidance:
          'The G major scale has one sharp: F\u266F (the black key just above F). Play F\u266F instead of F every time. The fingering is the same as the C major scale.',
      }),
      exercise('F', 'major-scale', {
        guidance: {
          right: 'The F major scale has one flat: B\u266D (the black key just below B). The fingering is slightly different from C and G major.',
          left: 'The left hand F major fingering is different from the right hand, but similar to the left hand fingering for C and G major.',
        },
      }),
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
