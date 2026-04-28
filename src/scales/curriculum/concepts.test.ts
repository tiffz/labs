import { describe, it, expect } from 'vitest';
import {
  getNewCliffConceptKeys,
  isCliffConceptKey,
  stuckJumpCoachingBulletLines,
  stuckJumpCoachingModalTip,
} from './concepts';
import type { ExerciseDefinition } from './types';
import { buildPentascaleStages } from './stages';

describe('stuck jump vs incremental (concept diffs)', () => {
  const pentascaleAStages = buildPentascaleStages('A-major-pentascale', 4);
  const pentExercise: ExerciseDefinition = {
    id: 'A-major-pentascale',
    key: 'A',
    kind: 'pentascale-major',
    label: 'A Major Pentascale',
    stages: pentascaleAStages,
  };

  it('marks subdivision and coordination concepts as cliff keys', () => {
    expect(isCliffConceptKey('triplets')).toBe(true);
    expect(isCliffConceptKey('moderateTempo')).toBe(false);
    expect(isCliffConceptKey('metronome')).toBe(false);
  });

  it('treats p7 → p8 as a jump (triplets newly active)', () => {
    const p7 = pentascaleAStages.find(s => s.stageNumber === 7)!;
    const p8 = pentascaleAStages.find(s => s.stageNumber === 8)!;
    const added = getNewCliffConceptKeys(p8, p7, pentExercise);
    expect(added).toContain('triplets');
    expect(added).not.toContain('moderateTempo');
  });

  it('treats p6 → p7 as incremental (only moderate tempo added)', () => {
    const p6 = pentascaleAStages.find(s => s.stageNumber === 6)!;
    const p7 = pentascaleAStages.find(s => s.stageNumber === 7)!;
    expect(getNewCliffConceptKeys(p7, p6, pentExercise)).toEqual([]);
  });

  it('returns no cliff keys when there is no previous stage', () => {
    const p1 = pentascaleAStages[0]!;
    expect(getNewCliffConceptKeys(p1, null, pentExercise)).toEqual([]);
  });

  it('emits triplet coaching bullets when triplets are in the added cliff set', () => {
    const bullets = stuckJumpCoachingBulletLines(['triplets']);
    expect(bullets.some(b => b.includes('1 + a'))).toBe(true);
  });

  it('stuckJumpCoachingModalTip gives a neutral one-line triplet hint', () => {
    const tip = stuckJumpCoachingModalTip(['triplets']);
    expect(tip).toContain('1+a');
    expect(tip.toLowerCase()).not.toContain('attempt');
  });
});
