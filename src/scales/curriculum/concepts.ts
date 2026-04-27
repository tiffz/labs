import type { ExerciseDefinition, Stage } from './types';

/**
 * Pedagogical concepts the contextual-guidance system tracks.
 *
 * Every concept fires the first time a stage triggering it is reached,
 * shows a one-shot intro in the onboarding modal, then never re-appears.
 * The set is intentionally additive — new concepts
 * append here without breaking the v3 schema migration in
 * `progress/store.ts`.
 */
export type ConceptKey =
  | 'pentascalePattern'
  | 'freeTempo'
  | 'metronome'
  | 'handsTogether'
  | 'moderateTempo'
  | 'fromMemory'
  | 'targetTempo'
  | 'eighthSubdivision'
  | 'triplets'
  | 'sixteenths'
  | 'twoOctaves'
  | 'thumbUnder';

export interface ConceptIntro {
  key: ConceptKey;
  /** Eyebrow / heading for the intro card. Short and concrete. */
  title: string;
  /** Body copy in the warm-music-teacher voice. 1–3 sentences. */
  body: string;
}

/**
 * One-shot intros shown the first time the user encounters a concept.
 * Voice charter: second person, warm but direct, no marketing tells,
 * no rules-restating prose. Each intro should leave the user knowing
 * what's new about this level and why it matters. Fingering and video
 * URLs stay next to the score, not here.
 */
export const CONCEPT_INTROS: Record<ConceptKey, ConceptIntro> = {
  pentascalePattern: {
    key: 'pentascalePattern',
    title: 'Five-note warmups',
    body: 'A pentascale is the first five notes up and back, all within a small, comfortable hand span.',
  },
  freeTempo: {
    key: 'freeTempo',
    title: 'Free tempo',
    body: 'No metronome here: take the time you need. Accuracy first; the click returns on later levels.',
  },
  metronome: {
    key: 'metronome',
    title: 'Playing with the click',
    body: 'Four-beat count-in, then one note per beat with the metronome. The new job is rhythm, not note-finding.',
  },
  handsTogether: {
    key: 'handsTogether',
    title: 'Both hands together',
    body: 'Same notes in different octaves—keep them aligned. Twin thumbs on the tonic are easy sync checkpoints.',
  },
  moderateTempo: {
    key: 'moderateTempo',
    title: 'Picking up the pace',
    body: 'Tempo steps up. If you tense, soften the motion before chasing speed.',
  },
  fromMemory: {
    key: 'fromMemory',
    title: 'From memory',
    body: 'Guide playback is off - you still see the score and hear the click. Trust the pattern you have built.',
  },
  targetTempo: {
    key: 'targetTempo',
    title: 'Target tempo',
    body: 'Full tempo from memory: evenness over bravado. Hold one clean pass to clear.',
  },
  eighthSubdivision: {
    key: 'eighthSubdivision',
    title: 'Two notes per beat',
    body: 'Two notes per click - downbeat plus the "and." The click only marks beats; you supply the middle.',
  },
  triplets: {
    key: 'triplets',
    title: 'Three notes per beat',
    body: 'Three even notes per click - often trickier than it looks. Count "trip-let" if it helps.',
  },
  sixteenths: {
    key: 'sixteenths',
    title: 'Four notes per beat',
    body: 'Four notes per click at a modest beat—the work is evenness inside each beat.',
  },
  twoOctaves: {
    key: 'twoOctaves',
    title: 'Two octaves',
    body: 'Extra range means an extra thumb-under at the octave. Think 3–4–3 at the seam.',
  },
  thumbUnder: {
    key: 'thumbUnder',
    title: 'Thumb-under crossings',
    body: 'Full scales travel by tucking the thumb under 3 or 4. Fingerings printed on the score mark each crossing.',
  },
};

/**
 * Compute which concepts a stage triggers, given its parent exercise.
 *
 * Used in two places:
 *   - `progress/store.ts` migration walks every history record and
 *     pre-fills `introducedConcepts` so returning users see no modal
 *     for content they've already worked through.
 *   - `guidance/computeGuidance.ts` evaluates the current stage at
 *     render time and intersects with un-set flags.
 *
 * The function is purely declarative: each concept's trigger maps to
 * a stage attribute (or to the exercise kind for `thumbUnder`). New
 * concepts add their predicate here.
 */
export function triggerConcepts(stage: Stage, exercise: ExerciseDefinition): ConceptKey[] {
  const concepts: ConceptKey[] = [];

  if (!stage.useTempo) {
    concepts.push('freeTempo');
  }
  if (stage.useMetronome) {
    concepts.push('metronome');
  }
  if (stage.hand === 'both') {
    concepts.push('handsTogether');
  }
  // Slow tempo (52 bpm) is the onboarding click. Anything above that
  // is meaningfully faster and triggers the moderateTempo intro. We
  // gate on `useTempo === true` so free-tempo stages don't trip it.
  if (stage.useTempo && stage.bpm > 52) {
    concepts.push('moderateTempo');
  }
  if (stage.mutePlayback) {
    concepts.push('fromMemory');
  }
  // The target-tempo intro is reserved for the "Fluent" gate of full
  // scales / arpeggios, which sits at the exercise's published target
  // BPM. Pentascale fluent-checkpoints (also `kind: 'fluent-checkpoint'`)
  // sit at moderate tempo and are covered by `moderateTempo`, not
  // `targetTempo` — so we exclude pentascales here.
  if (
    stage.kind === 'fluent-checkpoint' &&
    !isPentascaleKind(exercise.kind)
  ) {
    concepts.push('targetTempo');
  }
  if (stage.subdivision === 'eighth') {
    concepts.push('eighthSubdivision');
  }
  if (stage.subdivision === 'triplet') {
    concepts.push('triplets');
  }
  if (stage.subdivision === 'sixteenth') {
    concepts.push('sixteenths');
  }
  if (stage.octaves === 2) {
    concepts.push('twoOctaves');
  }
  // `thumbUnder` is purely an exercise-kind property: every stage of a
  // full scale or arpeggio involves at least one thumb-under, so the
  // concept fires on the very first encounter and stays one-shot from
  // there. Pentascales never have thumb-unders, by definition.
  if (!isPentascaleKind(exercise.kind)) {
    concepts.push('thumbUnder');
  } else {
    concepts.push('pentascalePattern');
  }

  return concepts;
}

function isPentascaleKind(kind: ExerciseDefinition['kind']): boolean {
  return kind === 'pentascale-major' || kind === 'pentascale-minor';
}
