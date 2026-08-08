import { describe, expect, it } from 'vitest';
import { planFreePracticeSession, planRoutineSession } from './freePractice';
import {
  buildFreeSessionExercise,
  freeExerciseId,
  freeStageId,
  isSyntheticExerciseId,
} from './practiceItem';
import { ROUTINE_TEMPLATES } from './routineTemplates';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import type { PracticeItem, ScalesCustomRoutine } from '../curriculum/types';

const bbMajor: PracticeItem = {
  kind: 'major-scale',
  key: 'Bb',
  hand: 'both',
  octaves: 2,
  bpm: 80,
  subdivision: 'none',
};

describe('practiceItem', () => {
  it('mints prefixed synthetic ids that the predicate recognizes', () => {
    const ex = buildFreeSessionExercise(bbMajor);
    expect(ex.exerciseId).toBe('free:major-scale:Bb');
    expect(isSyntheticExerciseId(ex.exerciseId)).toBe(true);
    expect(isSyntheticExerciseId('C-major-scale')).toBe(false);
  });

  it('is deterministic — same item yields the same ids', () => {
    expect(freeExerciseId(bbMajor)).toBe(freeExerciseId({ ...bbMajor }));
    expect(freeStageId(bbMajor)).toBe(freeStageId({ ...bbMajor }));
  });

  it('encodes distinguishing params into the stage id', () => {
    expect(freeStageId(bbMajor)).not.toBe(freeStageId({ ...bbMajor, bpm: 100 }));
    expect(freeStageId(bbMajor)).not.toBe(freeStageId({ ...bbMajor, hand: 'right' }));
  });

  it('applies plain-metronome defaults for optional fields', () => {
    const ex = buildFreeSessionExercise(bbMajor);
    expect(ex.useMetronome).toBe(true);
    expect(ex.clickMode).toBe('beat');
    expect(ex.mutePlayback).toBe(false);
    expect(ex.purpose).toBe('new');
  });

  it('builds a renderable score without touching the curriculum', () => {
    expect(generateScoreForExercise(buildFreeSessionExercise(bbMajor))).not.toBeNull();
  });
});

describe('plan constructors', () => {
  it('plans a one-item free-practice session tagged free', () => {
    const plan = planFreePracticeSession(bbMajor, 123);
    expect(plan.kind).toBe('free');
    expect(plan.generatedAt).toBe(123);
    expect(plan.exercises).toHaveLength(1);
    expect(plan.exercises[0].exerciseId).toBe('free:major-scale:Bb');
  });

  it('plans a routine session preserving item order, tagged routine', () => {
    const routine: ScalesCustomRoutine = {
      id: 'r1',
      name: 'Mine',
      updatedAt: '2026-01-01T00:00:00.000Z',
      items: [
        { kind: 'major-scale', key: 'C', hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' },
        { kind: 'natural-minor-scale', key: 'A', hand: 'both', octaves: 2, bpm: 72, subdivision: 'none' },
      ],
    };
    const plan = planRoutineSession(routine, 5);
    expect(plan.kind).toBe('routine');
    expect(plan.exercises.map(e => e.exerciseId)).toEqual([
      'free:major-scale:C',
      'free:natural-minor-scale:A',
    ]);
  });
});

describe('routine templates', () => {
  it('every template item generates a valid score', () => {
    const failures: string[] = [];
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.items.length).toBeGreaterThan(0);
      for (const item of template.items) {
        if (!generateScoreForExercise(buildFreeSessionExercise(item))) {
          failures.push(`${template.id}: ${item.kind} ${item.key}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
