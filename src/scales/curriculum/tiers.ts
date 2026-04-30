import type { Key } from '../../shared/music/scoreTypes';
import type { ExerciseKind, Tier, ExerciseDefinition } from './types';
import { buildStages, buildPentascaleStages } from './stages';

type ExerciseBuilderOpts = Pick<ExerciseDefinition, 'guidance' | 'helpUrl'>;

const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  'pentascale-major': 'Major Pentascale',
  'pentascale-minor': 'Minor Pentascale',
  'major-scale': 'Major Scale',
  'natural-minor-scale': 'Natural Minor Scale',
  'harmonic-minor-scale': 'Harmonic Minor Scale',
  'melodic-minor-scale': 'Melodic Minor Scale',
  'arpeggio-major': 'Major Arpeggio',
  'arpeggio-minor': 'Minor Arpeggio',
};

export function isPentascaleKind(kind: ExerciseKind): boolean {
  return kind === 'pentascale-major' || kind === 'pentascale-minor';
}

function exercise(
  key: Key,
  kind: ExerciseKind,
  opts?: ExerciseBuilderOpts,
): ExerciseDefinition {
  const id = `${key}-${kind}`;
  return {
    id,
    key,
    kind,
    label: `${key} ${EXERCISE_LABELS[kind]}`,
    stages: isPentascaleKind(kind)
      ? buildPentascaleStages(id)
      : buildStages(id),
    ...(opts ?? {}),
  };
}

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Spiral curriculum: each tier introduces a few keys, mixing scales and arpeggios.
 * Keys follow the circle of fifths for pedagogical progression.
 * Arpeggios are introduced in Tier 2 once the student has basic scale fluency.
 *
 * Each `exercise(...)` call carries a `guidance` string (or per-hand object when
 * the LH and RH fingerings diverge meaningfully) and a `helpUrl` pointing at a
 * YouTube search query, so the pre-start panel can show key-specific coaching
 * rather than a generic copy block.
 */
export const TIERS: Tier[] = [
  {
    id: 'tier-0',
    tierNumber: 0,
    label: 'Five-finger warmups',
    description:
      'Five-finger patterns in C, G, F, D, and A, each in one span. After quarter-note fluency, each key adds eighth notes, then triplets, then sixteenths.',
    exercises: [
      exercise('C', 'pentascale-major', {
        guidance: {
          right:
            'C-D-E-F-G: RH 1-5 from middle C. One finger per note; keep tone even.',
          left:
            'Same notes as your first RH C pentascale (up to G), now an octave lower. LH 5-1, pinky on low C, thumb on G. The pinky is softer than the thumb; that is normal.',
          both:
            'Same five notes in both hands, octave apart (RH 1-5, LH 5-1). Match the low Cs, then the high Gs. Outside fingers on the outsides, not two thumbs on one key.',
        },
        helpUrl: ytSearch('C major five finger pattern piano'),
      }),
      exercise('G', 'pentascale-major', {
        guidance:
          'G-A-B-C-D, all white keys (F\u266F is above the pattern). Same 1-5 shape as C, shifted.',
        helpUrl: ytSearch('G major five finger pattern piano'),
      }),
      exercise('F', 'pentascale-major', {
        guidance:
          'F-G-A-B\u266D-C: finger 4 on B\u266D. Same five-finger frame as C; only the 4th note is black.',
        helpUrl: ytSearch('F major five finger pattern piano'),
      }),
      exercise('D', 'pentascale-major', {
        guidance:
          'D-E-F\u266F-G-A: finger 3 on F\u266F. Black key mid-pattern - same shape as C.',
        helpUrl: ytSearch('D major five finger pattern piano'),
      }),
      exercise('A', 'pentascale-major', {
        guidance:
          'A-B-C\u266F-D-E: finger 3 on C\u266F. Same mid-black layout as D.',
        helpUrl: ytSearch('A major five finger pattern piano'),
      }),
    ],
  },
  {
    id: 'tier-1',
    tierNumber: 1,
    label: 'Foundation',
    description:
      'C first, then G, then F. Focuses on white keys while you lock in thumb-unders and crossings.',
    exercises: [
      exercise('C', 'major-scale', {
        guidance: {
          right:
            'RH: thumb tucks under 3 on F going up; level wrist, no reaching.',
          left:
            'LH: thumb-under after 3 on G - different spot than RH; that is normal.',
          both:
            'BH: thumb-unders land on different beats - sync when both thumbs hit.',
        },
        helpUrl: ytSearch('how to play C major scale piano fingering'),
      }),
      exercise('G', 'major-scale', {
        guidance:
          'One sharp (F\u266F). Same fingering as C major; 7th degree is a black key.',
        helpUrl: ytSearch('how to play G major scale piano fingering'),
      }),
      exercise('F', 'major-scale', {
        guidance: {
          right:
            'RH: one flat (B\u266D); ends on 4 at top - thumb-under after 4 going up.',
          left:
            'LH: B\u266D where C major uses B-natural; thumb-under landmarks match the LH C drill from earlier in Tier 1.',
        },
        helpUrl: ytSearch('how to play F major scale piano fingering'),
      }),
    ],
  },
  {
    id: 'tier-2',
    tierNumber: 2,
    label: 'Expanding Range',
    description:
      'D and B\u266D majors (first non-thumb start on B\u266D), plus C, G, and F arpeggios. Same three chord tones, wider leaps.',
    exercises: [
      exercise('D', 'major-scale', {
        guidance:
          'Two sharps (F\u266F, C\u266F). Standard C-major fingering in both hands.',
        helpUrl: ytSearch('how to play D major scale piano fingering'),
      }),
      exercise('Bb', 'major-scale', {
        guidance: {
          right:
            'RH starts on 2 (thumb on 2nd note C) - easy to miss.',
          left:
            'LH starts on 3; long fingers on black keys once set.',
        },
        helpUrl: ytSearch('how to play B flat major scale piano fingering'),
      }),
      exercise('C', 'arpeggio-major', {
        guidance:
          'C-E-G: RH 1-2-3-5 / LH 5-3-2-1. Rotate into octave jumps - do not reach with the thumb.',
        helpUrl: ytSearch('how to play C major arpeggio piano fingering'),
      }),
      exercise('G', 'arpeggio-major', {
        guidance:
          'G-B-D: same shape as C; mind the octave thumb crossing.',
        helpUrl: ytSearch('how to play G major arpeggio piano fingering'),
      }),
      exercise('F', 'arpeggio-major', {
        guidance:
          'F-A-C: same shape; smooth C up to next F.',
        helpUrl: ytSearch('how to play F major arpeggio piano fingering'),
      }),
    ],
  },
  {
    id: 'tier-3',
    tierNumber: 3,
    label: 'Minor Keys Begin',
    description:
      'A and E\u266D majors; A and D minors in natural, harmonic, and melodic forms. Fingerings stay familiar; the sound shifts to minor.',
    exercises: [
      exercise('A', 'major-scale', {
        guidance:
          'Three sharps; standard C-major fingering - black-white pairs help the hand map.',
        helpUrl: ytSearch('how to play A major scale piano fingering'),
      }),
      exercise('Eb', 'major-scale', {
        guidance: {
          right:
            'RH starts on 3 - long fingers on black keys.',
          left:
            'LH starts on 3; hands feel symmetric once set.',
        },
        helpUrl: ytSearch('how to play E flat major scale piano fingering'),
      }),
      exercise('A', 'natural-minor-scale', {
        guidance:
          'All white keys (relative of C major). Same fingering as C major; minor color only.',
        helpUrl: ytSearch('how to play A natural minor scale piano fingering'),
      }),
      exercise('A', 'harmonic-minor-scale', {
        guidance:
          'Natural minor with raised 7 (G\u266F). Same fingering as A natural minor.',
        helpUrl: ytSearch('how to play A harmonic minor scale piano fingering'),
      }),
      exercise('A', 'melodic-minor-scale', {
        guidance:
          'Up: raised 6-7; down: natural minor. Follow the score - fingering like A natural minor.',
        helpUrl: ytSearch('how to play A melodic minor scale piano fingering'),
      }),
      exercise('D', 'natural-minor-scale', {
        guidance:
          'One flat (B\u266D); same notes as F major from D. C-major fingering.',
        helpUrl: ytSearch('how to play D natural minor scale piano fingering'),
      }),
      exercise('D', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (C\u266F). Same frame as D natural minor.',
        helpUrl: ytSearch('how to play D harmonic minor scale piano fingering'),
      }),
      exercise('D', 'melodic-minor-scale', {
        guidance:
          'Different notes up vs down - leading tone resolves on the ascent.',
        helpUrl: ytSearch('how to play D melodic minor scale piano fingering'),
      }),
      exercise('D', 'arpeggio-major', {
        guidance:
          'D-F\u266F-A: same 1-2-3-5 shape as C/G/F.',
        helpUrl: ytSearch('how to play D major arpeggio piano fingering'),
      }),
      exercise('Bb', 'arpeggio-major', {
        guidance: {
          right:
            'RH starts on 2 (thumb on D) like the B\u266D scale.',
          left:
            'LH starts on 3; wrist slightly forward.',
        },
        helpUrl: ytSearch('how to play B flat major arpeggio piano fingering'),
      }),
    ],
  },
  {
    id: 'tier-4',
    tierNumber: 4,
    label: 'Sharps & Flats',
    description:
      'E and A\u266D majors; E and G minors; first minor arpeggios. More black keys, same calm hand setup.',
    exercises: [
      exercise('E', 'major-scale', {
        guidance:
          'Four sharps; standard C-major fingering - busier page, familiar hand.',
        helpUrl: ytSearch('how to play E major scale piano fingering'),
      }),
      exercise('Ab', 'major-scale', {
        guidance: {
          right:
            'RH starts on 3 - long fingers on flats.',
          left:
            'LH starts on 3; BH often feels easier than hands alone.',
        },
        helpUrl: ytSearch('how to play A flat major scale piano fingering'),
      }),
      exercise('E', 'natural-minor-scale', {
        guidance:
          'One sharp; relative of G major. C-major fingering - listen for minor color.',
        helpUrl: ytSearch('how to play E natural minor scale piano fingering'),
      }),
      exercise('E', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (D\u266F). Same fingering frame as E natural minor.',
        helpUrl: ytSearch('how to play E harmonic minor scale piano fingering'),
      }),
      exercise('E', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 up; natural minor down - follow the printed notes.',
        helpUrl: ytSearch('how to play E melodic minor scale piano fingering'),
      }),
      exercise('G', 'natural-minor-scale', {
        guidance: {
          right:
            'Two flats; RH starts on thumb (not like B\u266D major on 2).',
          left:
            'LH starts on 5; still C-major fingering.',
        },
        helpUrl: ytSearch('how to play G natural minor scale piano fingering'),
      }),
      exercise('G', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (F\u266F). Same as G natural minor except F\u266F.',
        helpUrl: ytSearch('how to play G harmonic minor scale piano fingering'),
      }),
      exercise('G', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 ascending; revert descending.',
        helpUrl: ytSearch('how to play G melodic minor scale piano fingering'),
      }),
      exercise('A', 'arpeggio-major', {
        guidance:
          'A-C\u266F-E: standard 1-2-3-5; hear the major third clearly.',
        helpUrl: ytSearch('how to play A major arpeggio piano fingering'),
      }),
      exercise('Eb', 'arpeggio-major', {
        guidance: {
          right:
            'RH starts on 2, thumb on G.',
          left:
            'LH starts on 3 - verify printed fingering.',
        },
        helpUrl: ytSearch('how to play E flat major arpeggio piano fingering'),
      }),
      exercise('A', 'arpeggio-minor', {
        guidance:
          'A-C-E: same shape as C major arpeggio; natural third = minor color.',
        helpUrl: ytSearch('how to play A minor arpeggio piano fingering'),
      }),
      exercise('D', 'arpeggio-minor', {
        guidance:
          'D-F-A: parallel to F major arpeggio shape.',
        helpUrl: ytSearch('how to play D minor arpeggio piano fingering'),
      }),
    ],
  },
  {
    id: 'tier-5',
    tierNumber: 5,
    label: 'Advanced Keys',
    description:
      'B, D\u266D, and F\u266F majors, the next minors, and harder arpeggios. Black-key roots reward slow, clear mapping.',
    exercises: [
      exercise('B', 'major-scale', {
        guidance: {
          right:
            'Five sharps; standard RH fingering - wrist forward on black keys.',
          left:
            'LH starts on 4 (not 5) - remember the one quirk.',
        },
        helpUrl: ytSearch('how to play B major scale piano fingering'),
      }),
      exercise('Db', 'major-scale', {
        guidance: {
          right:
            'RH starts on 2; thumbs only on C and F.',
          left:
            'LH starts on 3; fingering repeats each octave.',
        },
        helpUrl: ytSearch('how to play D flat major scale piano fingering'),
      }),
      exercise('F#', 'major-scale', {
        guidance: {
          right:
            'Six sharps; RH on 2 - long fingers do the work.',
          left:
            'LH starts on 4 like B major.',
        },
        helpUrl: ytSearch('how to play F sharp major scale piano fingering'),
      }),
      exercise('B', 'natural-minor-scale', {
        guidance:
          'Two sharps; relative of D major. Standard C-major fingering.',
        helpUrl: ytSearch('how to play B natural minor scale piano fingering'),
      }),
      exercise('B', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (A\u266F). Same frame as B natural minor.',
        helpUrl: ytSearch('how to play B harmonic minor scale piano fingering'),
      }),
      exercise('B', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 up; natural minor down.',
        helpUrl: ytSearch('how to play B melodic minor scale piano fingering'),
      }),
      exercise('C', 'natural-minor-scale', {
        guidance: {
          right:
            'Three flats; RH on thumb (not E\u266D major\'s 3).',
          left:
            'LH on 5; still C-major fingering.',
        },
        helpUrl: ytSearch('how to play C natural minor scale piano fingering'),
      }),
      exercise('C', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (B natural). Same fingering as C natural minor.',
        helpUrl: ytSearch('how to play C harmonic minor scale piano fingering'),
      }),
      exercise('C', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 ascending; flats return descending.',
        helpUrl: ytSearch('how to play C melodic minor scale piano fingering'),
      }),
      exercise('F', 'natural-minor-scale', {
        guidance: {
          right:
            'Four flats; RH on thumb unlike A\u266D parallel major.',
          left:
            'LH matches F-major fingering with flats.',
        },
        helpUrl: ytSearch('how to play F natural minor scale piano fingering'),
      }),
      exercise('F', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (E natural). Same as F natural minor otherwise.',
        helpUrl: ytSearch('how to play F harmonic minor scale piano fingering'),
      }),
      exercise('F', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 up; natural minor down.',
        helpUrl: ytSearch('how to play F melodic minor scale piano fingering'),
      }),
      exercise('E', 'arpeggio-major', {
        guidance:
          'E-G\u266F-B: standard 1-2-3-5; nail the major third.',
        helpUrl: ytSearch('how to play E major arpeggio piano fingering'),
      }),
      exercise('Ab', 'arpeggio-major', {
        guidance: {
          right:
            'RH starts on 2, thumb on C.',
          left:
            'LH on 3; hand forward.',
        },
        helpUrl: ytSearch('how to play A flat major arpeggio piano fingering'),
      }),
      exercise('E', 'arpeggio-minor', {
        guidance:
          'E-G-B: natural third vs E major - same shape.',
        helpUrl: ytSearch('how to play E minor arpeggio piano fingering'),
      }),
      exercise('G', 'arpeggio-minor', {
        guidance:
          'G-B\u266D-D: only change from G major is the middle third.',
        helpUrl: ytSearch('how to play G minor arpeggio piano fingering'),
      }),
    ],
  },
  {
    id: 'tier-6',
    tierNumber: 6,
    label: 'All Keys Mastery',
    description:
      'Remaining minor scales and arpeggios to round out all twelve keys. Take one key at a time.',
    exercises: [
      exercise('Bb', 'natural-minor-scale', {
        guidance: {
          right:
            'Five flats; RH on 2 like B\u266D major.',
          left:
            'LH crossings differ from B\u266D major - follow print.',
        },
        helpUrl: ytSearch('how to play B flat natural minor scale piano fingering'),
      }),
      exercise('Bb', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (A natural). Same as B\u266D natural minor otherwise.',
        helpUrl: ytSearch('how to play B flat harmonic minor scale piano fingering'),
      }),
      exercise('Bb', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 up; flats down.',
        helpUrl: ytSearch('how to play B flat melodic minor scale piano fingering'),
      }),
      exercise('Eb', 'natural-minor-scale', {
        guidance:
          'Six flats - long fingers on black keys like E\u266D major.',
        helpUrl: ytSearch('how to play E flat natural minor scale piano fingering'),
      }),
      exercise('Eb', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (D natural). Same frame as E\u266D natural minor.',
        helpUrl: ytSearch('how to play E flat harmonic minor scale piano fingering'),
      }),
      exercise('Eb', 'melodic-minor-scale', {
        guidance:
          'Raised 6-7 ascending; revert descending.',
        helpUrl: ytSearch('how to play E flat melodic minor scale piano fingering'),
      }),
      exercise('Ab', 'natural-minor-scale', {
        guidance:
          'Seven flats - visually dense, physically ergonomic.',
        helpUrl: ytSearch('how to play A flat natural minor scale piano fingering'),
      }),
      exercise('Ab', 'harmonic-minor-scale', {
        guidance:
          'Raised 7 (G natural). Same as A\u266D natural minor otherwise.',
        helpUrl: ytSearch('how to play A flat harmonic minor scale piano fingering'),
      }),
      exercise('Ab', 'melodic-minor-scale', {
        guidance:
          'Most note toggles of any melodic minor here - trust the score.',
        helpUrl: ytSearch('how to play A flat melodic minor scale piano fingering'),
      }),
      exercise('B', 'arpeggio-major', {
        guidance:
          'B-D\u266F-F\u266F: 1-2-3-5; two blacks of three.',
        helpUrl: ytSearch('how to play B major arpeggio piano fingering'),
      }),
      exercise('Db', 'arpeggio-major', {
        guidance: {
          right:
            'RH on 2; two blacks - very ergonomic.',
          left:
            'LH on 3.',
        },
        helpUrl: ytSearch('how to play D flat major arpeggio piano fingering'),
      }),
      exercise('F#', 'arpeggio-major', {
        guidance: {
          right:
            'All black keys; RH on 2, hand forward.',
          left:
            'LH on 4.',
        },
        helpUrl: ytSearch('how to play F sharp major arpeggio piano fingering'),
      }),
      exercise('B', 'arpeggio-minor', {
        guidance:
          'B-D-F\u266F: natural third vs B major.',
        helpUrl: ytSearch('how to play B minor arpeggio piano fingering'),
      }),
      exercise('C', 'arpeggio-minor', {
        guidance:
          'C-E\u266D-G: only change from C major is the third.',
        helpUrl: ytSearch('how to play C minor arpeggio piano fingering'),
      }),
      exercise('F', 'arpeggio-minor', {
        guidance:
          'F-A\u266D-C: third flat vs F major.',
        helpUrl: ytSearch('how to play F minor arpeggio piano fingering'),
      }),
      exercise('Bb', 'arpeggio-minor', {
        guidance:
          'B\u266D-D\u266D-F: parallel to B\u266D major shape.',
        helpUrl: ytSearch('how to play B flat minor arpeggio piano fingering'),
      }),
      exercise('Eb', 'arpeggio-minor', {
        guidance:
          'All black arpeggio; RH on 2, forward wrist.',
        helpUrl: ytSearch('how to play E flat minor arpeggio piano fingering'),
      }),
      exercise('Ab', 'arpeggio-minor', {
        guidance:
          'A\u266D-C\u266D-E\u266D: C\u266D sounds as white B - comfortable span.',
        helpUrl: ytSearch('how to play A flat minor arpeggio piano fingering'),
      }),
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
