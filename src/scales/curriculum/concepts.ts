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
  /**
   * When true, encountering this concept as **new vs the previous stage**
   * (`triggerConcepts` diff) is treated as a pedagogical **jump** for
   * stuck-session UX: coaching-first dialog instead of defaulting to
   * “drop back a level.”
   */
  stuckJump: boolean;
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
    stuckJump: false,
  },
  freeTempo: {
    key: 'freeTempo',
    title: 'Free tempo',
    body: 'No metronome here: take the time you need. Accuracy first; the click returns on later levels.',
    stuckJump: false,
  },
  metronome: {
    key: 'metronome',
    title: 'Playing with the click',
    body: 'Four-beat count-in, then one note per beat with the metronome. The new job is rhythm, not note-finding.',
    stuckJump: false,
  },
  handsTogether: {
    key: 'handsTogether',
    title: 'Both hands together',
    body: 'Same notes in different octaves. Line the hands up; matching thumbs on the tonic is a simple sync check.',
    stuckJump: true,
  },
  moderateTempo: {
    key: 'moderateTempo',
    title: 'Picking up the pace',
    body: 'Tempo steps up. If you tense, soften the motion before chasing speed.',
    stuckJump: false,
  },
  fromMemory: {
    key: 'fromMemory',
    title: 'From memory',
    body: 'Guide playback is off. You still see the score and hear the click. Lean on the pattern you already built.',
    stuckJump: true,
  },
  targetTempo: {
    key: 'targetTempo',
    title: 'Target tempo',
    body: 'Full tempo from memory: evenness over bravado. Hold one clean pass to clear.',
    stuckJump: false,
  },
  eighthSubdivision: {
    key: 'eighthSubdivision',
    title: 'Two notes per beat',
    body:
      'Two notes for each click: the beat, then the “and” halfway between. Keep those two taps even. Short, calm reps usually settle it faster than rushing.',
    stuckJump: true,
  },
  triplets: {
    key: 'triplets',
    title: 'Three notes per beat',
    body:
      'Three even notes inside each click. Put the first note of each triplet on the metronome. Counting “1 + a, 2 + a…” out loud helps many people; it is not the same syllable pattern as eighth-note “1-and”.',
    stuckJump: true,
  },
  sixteenths: {
    key: 'sixteenths',
    title: 'Four notes per beat',
    body:
      'Four notes inside one click feels crowded at first. Let the click start each little group of four, then keep those four taps even before you add speed.',
    stuckJump: true,
  },
  twoOctaves: {
    key: 'twoOctaves',
    title: 'Two octaves',
    body: 'More range means another thumb-under at the octave. At the seam, think 3-4-3.',
    stuckJump: true,
  },
  thumbUnder: {
    key: 'thumbUnder',
    title: 'Thumb-under crossings',
    body: 'Full scales travel by tucking the thumb under 3 or 4. Fingerings printed on the score mark each crossing.',
    stuckJump: false,
  },
};

/** True when this concept marks a qualitative jump for stuck-session coaching. */
export function isCliffConceptKey(key: ConceptKey): boolean {
  return CONCEPT_INTROS[key].stuckJump;
}

/**
 * Concepts newly in force on `current` vs `previous` (same exercise), that
 * also count as stuck "jump" concepts.
 */
export function getNewCliffConceptKeys(
  current: Stage,
  previous: Stage | null,
  exercise: ExerciseDefinition,
): ConceptKey[] {
  if (!previous) return [];
  const curr = triggerConcepts(current, exercise);
  const prev = new Set(triggerConcepts(previous, exercise));
  return curr.filter(k => !prev.has(k) && isCliffConceptKey(k));
}

/**
 * One-line tip for the stuck-session jump modal — neutral coaching only
 * (no attempt counts or “how you’re doing” framing).
 */
export function stuckJumpCoachingModalTip(addedCliffKeys: ConceptKey[]): string {
  const set = new Set(addedCliffKeys);
  if (set.has('triplets')) {
    return 'Try counting triplets as 1+a, 2+a, 3+a, 4+a, with the click on each “1”.';
  }
  if (set.has('sixteenths')) {
    return 'Treat each click as the first of four even taps inside the beat.';
  }
  if (set.has('eighthSubdivision')) {
    return 'Say “1-and, 2-and” so the “and” sits halfway between clicks.';
  }
  if (set.has('handsTogether')) {
    return 'Line up the outsides of the pattern (low and high tonic together).';
  }
  if (set.has('fromMemory')) {
    return 'One slow pass: say the next note name before you play it.';
  }
  if (set.has('twoOctaves')) {
    return 'Extra attention at the octave seam usually pays off first.';
  }
  const lines = stuckJumpCoachingBulletLines(addedCliffKeys);
  return lines[0] ?? 'One slow pass with the metronome, then add notes back in.';
}

/** Short bullet lines for the stuck jump-coaching dialog (subset of `added`). */
export function stuckJumpCoachingBulletLines(addedCliffKeys: ConceptKey[]): string[] {
  const lines: string[] = [];
  const set = new Set(addedCliffKeys);
  if (set.has('triplets')) {
    lines.push('Count 1 + a, 2 + a… with the click on each “1”; let + and a split the beat evenly.');
  }
  if (set.has('sixteenths')) {
    lines.push('Treat each click as the start of a group of four even taps.');
  }
  if (set.has('eighthSubdivision')) {
    lines.push('Say “1-and, 2-and” once so the “and” sits halfway between clicks.');
  }
  if (set.has('handsTogether')) {
    lines.push('Line up the outsides of the pattern (low and high tonic together).');
  }
  if (set.has('fromMemory')) {
    lines.push('One slow pass: say the next note name before you play it.');
  }
  if (set.has('twoOctaves')) {
    lines.push('Extra attention at the octave seam usually pays off first.');
  }
  if (lines.length === 0) {
    lines.push('One slow pass with just the click, then add notes back in.');
  }
  return lines;
}

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
