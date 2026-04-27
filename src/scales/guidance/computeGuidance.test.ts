import { describe, it, expect } from 'vitest';
import { computeGuidance, isGuidancePayloadEmpty, resolveHandGuidance } from './computeGuidance';
import { findStage } from '../curriculum/tiers';
import type { ScalesProgressData } from '../progress/types';

function freshProgress(): ScalesProgressData {
  return {
    version: 3,
    exercises: {},
    currentTierId: 'tier-0',
    seenOnboarding: false,
    introducedConcepts: {},
    introducedExerciseHands: {},
  };
}

function getStage(exerciseId: string, stageId: string) {
  const found = findStage(exerciseId, stageId);
  if (!found) throw new Error(`Test fixture broken: ${exerciseId} / ${stageId}`);
  return found;
}

describe('resolveHandGuidance', () => {
  it('returns per-hand text for C pentascale right hand', () => {
    const { exercise } = getStage('C-pentascale-major', 'C-pentascale-major-p1');
    const text = resolveHandGuidance(exercise, 'right');
    expect(text).toContain('C-D-E-F-G');
  });
});

describe('computeGuidance — pentascales', () => {
  const PEN_C = 'C-pentascale-major';

  it('on the very first pentascale stage, surfaces pentascalePattern + freeTempo in the modal (no fingering payload)', () => {
    const { stage, exercise } = getStage(PEN_C, `${PEN_C}-p1`);
    const progress = freshProgress();

    const payload = computeGuidance(stage, exercise, progress);

    expect(payload.concepts.map(c => c.key)).toEqual(['pentascalePattern', 'freeTempo']);
    expect(isGuidancePayloadEmpty(payload)).toBe(false);
  });

  it('does not retrigger thumbUnder for any pentascale stage', () => {
    const { stage, exercise } = getStage(PEN_C, `${PEN_C}-p1`);
    const payload = computeGuidance(stage, exercise, freshProgress());

    expect(payload.concepts.map(c => c.key)).not.toContain('thumbUnder');
  });

  it('p3 (BH free) after p1+p2 concept intros fires pentascalePattern + handsTogether', () => {
    const { stage, exercise } = getStage(PEN_C, `${PEN_C}-p3`);
    const progress: ScalesProgressData = {
      ...freshProgress(),
      introducedConcepts: { freeTempo: true },
    };

    const payload = computeGuidance(stage, exercise, progress);

    expect(payload.concepts.map(c => c.key)).toEqual(['pentascalePattern', 'handsTogether']);
  });

  it('p4 (RH slow click) after earlier intros surfaces metronome only', () => {
    const { stage, exercise } = getStage(PEN_C, `${PEN_C}-p4`);
    const progress: ScalesProgressData = {
      ...freshProgress(),
      introducedConcepts: {
        pentascalePattern: true,
        freeTempo: true,
        handsTogether: true,
      },
    };

    const payload = computeGuidance(stage, exercise, progress);

    expect(payload.concepts.map(c => c.key)).toEqual(['metronome']);
  });

  it('p7 (BH 72 BPM, fluent gate) does NOT trigger the targetTempo intro for pentascales', () => {
    const { stage, exercise } = getStage(PEN_C, `${PEN_C}-p7`);
    const progress: ScalesProgressData = {
      ...freshProgress(),
      introducedConcepts: {
        pentascalePattern: true,
        freeTempo: true,
        metronome: true,
        handsTogether: true,
      },
    };

    const payload = computeGuidance(stage, exercise, progress);
    expect(payload.concepts.map(c => c.key)).toEqual(['moderateTempo']);
  });
});

describe('computeGuidance — full scales', () => {
  const C_MAJ = 'C-major-scale';

  it('s1 of the first full scale (after pentascales) introduces thumbUnder only in the modal', () => {
    const { stage, exercise } = getStage(C_MAJ, `${C_MAJ}-s1`);

    const progress: ScalesProgressData = {
      ...freshProgress(),
      currentTierId: 'tier-1',
      introducedConcepts: {
        pentascalePattern: true,
        freeTempo: true,
        metronome: true,
        handsTogether: true,
        moderateTempo: true,
      },
      introducedExerciseHands: {
        'C-pentascale-major': { right: true, left: true, both: true },
      },
    };

    const payload = computeGuidance(stage, exercise, progress);

    expect(payload.concepts.map(c => c.key)).toEqual(['thumbUnder']);
  });

  it('s5 of C major (BH slow) after s1-s4 concept intros yields an empty modal (fingering is inline only)', () => {
    const { stage, exercise } = getStage(C_MAJ, `${C_MAJ}-s5`);

    const progress: ScalesProgressData = {
      ...freshProgress(),
      currentTierId: 'tier-1',
      introducedConcepts: {
        pentascalePattern: true,
        freeTempo: true,
        metronome: true,
        handsTogether: true,
        thumbUnder: true,
      },
      introducedExerciseHands: {
        [C_MAJ]: { right: true, left: true },
      },
    };

    const payload = computeGuidance(stage, exercise, progress);
    expect(payload.concepts).toHaveLength(0);
    expect(isGuidancePayloadEmpty(payload)).toBe(true);
    expect(resolveHandGuidance(exercise, 'both')).toContain('BH:');
  });

  it('returning user with everything introduced gets an empty modal payload', () => {
    const { stage, exercise } = getStage(C_MAJ, `${C_MAJ}-s8`);

    const progress: ScalesProgressData = {
      ...freshProgress(),
      currentTierId: 'tier-1',
      introducedConcepts: {
        pentascalePattern: true,
        freeTempo: true,
        metronome: true,
        handsTogether: true,
        moderateTempo: true,
        fromMemory: true,
        targetTempo: true,
        eighthSubdivision: true,
        triplets: true,
        sixteenths: true,
        twoOctaves: true,
        thumbUnder: true,
      },
      introducedExerciseHands: {
        [C_MAJ]: { right: true, left: true, both: true },
      },
    };

    const payload = computeGuidance(stage, exercise, progress);
    expect(payload.concepts).toHaveLength(0);
    expect(isGuidancePayloadEmpty(payload)).toBe(true);
  });

  it('first full scale s8 (target tempo gate) for a user past Tier 0 surfaces fromMemory and targetTempo', () => {
    const { stage, exercise } = getStage(C_MAJ, `${C_MAJ}-s8`);

    const progress: ScalesProgressData = {
      ...freshProgress(),
      currentTierId: 'tier-1',
      introducedConcepts: {
        pentascalePattern: true,
        freeTempo: true,
        metronome: true,
        handsTogether: true,
        moderateTempo: true,
        thumbUnder: true,
      },
      introducedExerciseHands: {
        [C_MAJ]: { right: true, left: true, both: true },
      },
    };

    const payload = computeGuidance(stage, exercise, progress);

    expect(payload.concepts.map(c => c.key)).toEqual([
      'fromMemory',
      'targetTempo',
    ]);
  });
});
