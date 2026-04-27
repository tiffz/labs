import type { Stage } from './types';

/**
 * The canonical stage progression for every exercise.
 *
 * Ordering roughly tracks RCM / Faber-style scale pedagogy:
 *   - 1-8:   single-octave fluency (free tempo → hands-together at tempo)
 *            stage 8 is the Fluent checkpoint
 *   - 9-10:  eighth-note subdivision, 1 octave (two notes per beat)
 *   - 11-12: triplet subdivision, 1 octave (three notes per beat; sits
 *            pedagogically between eighths and sixteenths in difficulty)
 *   - 13-14: sixteenth-note subdivision, 1 octave (four notes per beat)
 *   - 15-19: 2-octave on-ramp. The 1-oct → 2-oct jump introduces a new
 *            3-4-3 thumb-under at the octave boundary plus a much larger
 *            horizontal travel, and standard pedagogy (Ricker, Pianote,
 *            Melody Payne / Superstar Scales) is consistent that this
 *            should be drilled hands-separate at free tempo first, then
 *            with the metronome, and only then layered with hands
 *            together. We mirror the s1-s5 shape: RH free → LH free →
 *            RH slow → LH slow → BH slow.
 *   - 20-23: 2-octave both-hands work — the baseline definition of
 *            "knowing a scale" in mainstream piano pedagogy. Stage 23 is
 *            the mastery gate.
 *
 * Stage IDs s15..s18 are intentionally retained for the 2-octave
 * both-hands stages (moderate / eighths / triplets / sixteenths) to keep
 * existing localStorage progress meaningful; the five new on-ramp
 * stages use s14a..s14e.
 */
export function buildStages(exerciseId: string): Stage[] {
  return [
    {
      id: `${exerciseId}-s1`,
      stageNumber: 1,
      label: 'Right hand — free tempo',
      description: 'Right hand, free tempo - match each finger to its key.',
      hand: 'right',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s2`,
      stageNumber: 2,
      label: 'Left hand — free tempo',
      description: 'Left hand, free tempo - crossings differ from RH; go slowly.',
      hand: 'left',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s3`,
      stageNumber: 3,
      label: 'Right hand — slow tempo',
      description: 'Right hand with click: same notes, new job is landing on the beat.',
      hand: 'right',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s4`,
      stageNumber: 4,
      label: 'Left hand — slow tempo',
      description: 'Left hand with click - keep the wrist easy.',
      hand: 'left',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s5`,
      stageNumber: 5,
      label: 'Both hands — slow tempo',
      description: 'Both hands, slow tempo - align hands; twin thumbs mark sync spots.',
      hand: 'both',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s6`,
      stageNumber: 6,
      label: 'Both hands — moderate tempo',
      description: 'Both hands, faster click - relax before you push speed.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s7`,
      stageNumber: 7,
      label: 'Both hands — no guide',
      description: 'Guide off - from memory with metronome.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: true,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s8`,
      stageNumber: 8,
      label: 'Both hands — target tempo',
      description: 'Target tempo from memory - evenness is the bar.',
      hand: 'both',
      useTempo: true,
      bpm: 92,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: true,
      octaves: 1,
      // Passing this level means the learner can hold the scale in time at
      // a real tempo — that's the "Fluent" bar. Everything after this
      // (subdivisions, 2-octave work) is on the road to "Mastered".
      kind: 'fluent-checkpoint',
    },
    {
      id: `${exerciseId}-s9`,
      stageNumber: 9,
      label: 'Both hands — eighth notes (slow)',
      description: 'Two notes per beat at a relaxed tempo. The new feel is landing exactly between the clicks. Get that locked in before pushing the speed.',
      hand: 'both',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'eighth',
      mutePlayback: true,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s10`,
      stageNumber: 10,
      label: 'Both hands — eighth note subdivision',
      description: 'Eighths at working tempo - keep pairs even.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'eighth',
      mutePlayback: true,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s11`,
      stageNumber: 11,
      label: 'Both hands — triplets (slow)',
      description: 'Triplets, slow - three even notes per beat.',
      hand: 'both',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'triplet',
      mutePlayback: true,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s12`,
      stageNumber: 12,
      label: 'Both hands — triplet subdivision',
      description: 'Triplets at tempo - beat one anchors each group.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'triplet',
      mutePlayback: true,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s13`,
      stageNumber: 13,
      label: 'Both hands — sixteenth notes (slow)',
      description: 'Sixteenths, slow - four relaxed notes per beat.',
      hand: 'both',
      useTempo: true,
      bpm: 44,
      useMetronome: true,
      subdivision: 'sixteenth',
      mutePlayback: true,
      octaves: 1,
    },
    {
      id: `${exerciseId}-s14`,
      stageNumber: 14,
      label: 'Both hands — sixteenth note subdivision',
      description: 'Sixteenths at full subdivision speed.',
      hand: 'both',
      useTempo: true,
      bpm: 60,
      useMetronome: true,
      subdivision: 'sixteenth',
      mutePlayback: true,
      octaves: 1,
    },
    // Stages 15-19 are the 2-octave on-ramp. Standard piano pedagogy is
    // explicit that the 1-oct → 2-oct jump should NOT happen at the
    // metronome, hands together, all at once: the new fingering (an extra
    // 3-4-3 thumb-under at the octave boundary, plus the much larger
    // horizontal travel) needs to be learned hands-separately and at free
    // tempo first, and only then layered with metronome and hands
    // together. We mirror the s1-s5 shape (RH free → LH free → RH slow →
    // LH slow → BH slow) so the muscle-memory transfer is obvious.
    //
    // Stage *IDs* for the existing 2-octave both-hands stages are kept as
    // s15..s18 so any localStorage progress already pointing at one of
    // those keeps referring to the same exercise. The five new stages use
    // s14a..s14e for the same reason.
    {
      id: `${exerciseId}-s14a`,
      stageNumber: 15,
      label: 'Right hand — 2 octaves, free tempo',
      description: 'Two octaves, RH, free tempo - extra thumb-under at the octave.',
      hand: 'right',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s14b`,
      stageNumber: 16,
      label: 'Left hand — 2 octaves, free tempo',
      description: 'Same with the left hand. Chant "under 3, under 4, under 3" out loud if it helps lock the pattern in.',
      hand: 'left',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s14c`,
      stageNumber: 17,
      label: 'Right hand — 2 octaves, slow tempo',
      description: 'RH two octaves with click - smooth the boundary.',
      hand: 'right',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s14d`,
      stageNumber: 18,
      label: 'Left hand — 2 octaves, slow tempo',
      description: 'LH two octaves with click.',
      hand: 'left',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s14e`,
      stageNumber: 19,
      label: 'Both hands — 2 octaves, slow tempo',
      description: 'BH two octaves, slow - shared crossings as checkpoints.',
      hand: 'both',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s15`,
      stageNumber: 20,
      label: 'Both hands — 2 octaves, moderate tempo',
      description: 'BH two octaves, moderate tempo, guide off.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: true,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s16`,
      stageNumber: 21,
      label: 'Both hands — 2 octaves, eighths',
      description: 'BH two octaves, eighth notes.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'eighth',
      mutePlayback: true,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s17`,
      stageNumber: 22,
      label: 'Both hands — 2 octaves, triplets',
      description: 'BH two octaves, triplets.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'triplet',
      mutePlayback: true,
      octaves: 2,
    },
    {
      id: `${exerciseId}-s18`,
      stageNumber: 23,
      label: 'Both hands — 2 octaves, sixteenths',
      description: 'Mastery gate: BH two octaves, sixteenths, from memory.',
      hand: 'both',
      useTempo: true,
      bpm: 60,
      useMetronome: true,
      subdivision: 'sixteenth',
      mutePlayback: true,
      octaves: 2,
    },
  ];
}

/**
 * Pentascale (Tier 0) stage progression.
 *
 * Pentascales are five-finger patterns: one finger per note, no
 * thumb-unders, no horizontal travel. The whole point is to build
 * finger independence and evenness *before* the mechanical complexity
 * of a full scale's thumb-under crossing. So the curriculum is shorter
 * than full scales:
 *
 *   - p1-p3: free tempo for each hand, then both (RH → LH → BH)
 *   - p4-p6: same hand sequence with the metronome at slow tempo
 *   - p7:    both hands at moderate tempo — the Tier 0 fluent gate
 *
 * No subdivisions or 2-octave variants — pentascales sit before any of
 * that. By the time the user advances to full scales (Tier 1), the
 * contextual guidance system has already introduced `freeTempo`,
 * `metronome`, and `handsTogether`, leaving the first level of the
 * first full scale free to focus on the genuinely new mechanic
 * (thumb-unders).
 */
export function buildPentascaleStages(exerciseId: string): Stage[] {
  return [
    {
      id: `${exerciseId}-p1`,
      stageNumber: 1,
      label: 'Right hand — free tempo',
      description: 'Right hand, free tempo - no click yet.',
      hand: 'right',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-p2`,
      stageNumber: 2,
      label: 'Left hand — free tempo',
      description: 'Left hand, free tempo.',
      hand: 'left',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-p3`,
      stageNumber: 3,
      label: 'Both hands — free tempo',
      description: 'Both hands, free tempo - line up at each return.',
      hand: 'both',
      useTempo: false,
      bpm: 0,
      useMetronome: false,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-p4`,
      stageNumber: 4,
      label: 'Right hand — slow tempo',
      description: 'Right hand with metronome, slow.',
      hand: 'right',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-p5`,
      stageNumber: 5,
      label: 'Left hand — slow tempo',
      description: 'Left hand with click.',
      hand: 'left',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-p6`,
      stageNumber: 6,
      label: 'Both hands — slow tempo',
      description: 'Both hands at the same slow tempo. The thumbs land together at the start and end. Use those as your sync checkpoints.',
      hand: 'both',
      useTempo: true,
      bpm: 52,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
    },
    {
      id: `${exerciseId}-p7`,
      stageNumber: 7,
      label: 'Both hands — moderate tempo',
      description: 'Both hands, moderate tempo - Tier 0 fluency gate.',
      hand: 'both',
      useTempo: true,
      bpm: 72,
      useMetronome: true,
      subdivision: 'none',
      mutePlayback: false,
      octaves: 1,
      // Tier 0's "Fluent" gate. After this, the user has comfortably
      // played a five-finger pattern in time, hands together, in a
      // single key — and they're ready for the thumb-under that
      // defines real scales.
      kind: 'fluent-checkpoint',
    },
  ];
}
