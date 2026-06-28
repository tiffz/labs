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
  const pentascaleAStages = buildPentascaleStages('A-pentascale-major');
  const pentExercise: ExerciseDefinition = {
    id: 'A-pentascale-major',
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

  it('treats p7 → p8eg as a jump (eighth subdivision newly active)', () => {
    const p7 = pentascaleAStages.find(s => s.stageNumber === 7)!;
    const p8eg = pentascaleAStages.find(s => s.id.endsWith('-p8eg'))!;
    const added = getNewCliffConceptKeys(p8eg, p7, pentExercise);
    expect(added).toContain('eighthSubdivision');
    expect(added).not.toContain('triplets');
    expect(added).not.toContain('moderateTempo');
  });

  it('treats p8e → p8g as a jump (triplets newly active)', () => {
    const p8e = pentascaleAStages.find(s => s.id.endsWith('-p8e'))!;
    const p8g = pentascaleAStages.find(s => s.id.endsWith('-p8g'))!;
    const added = getNewCliffConceptKeys(p8g, p8e, pentExercise);
    expect(added).toContain('triplets');
    expect(added).not.toContain('moderateTempo');
  });

  it('treats p8 → p8tg as incremental (moderate tempo only)', () => {
    const p8 = pentascaleAStages.find(s => s.id.endsWith('-p8') && !s.id.endsWith('-p8e'))!;
    const p8tg = pentascaleAStages.find(s => s.id.endsWith('-p8tg'))!;
    expect(getNewCliffConceptKeys(p8tg, p8, pentExercise)).toEqual([]);
  });

  it('treats p8t → p9g as a jump (sixteenths newly active)', () => {
    const p8t = pentascaleAStages.find(s => s.id.endsWith('-p8t'))!;
    const p9g = pentascaleAStages.find(s => s.id.endsWith('-p9g'))!;
    const added = getNewCliffConceptKeys(p9g, p8t, pentExercise);
    expect(added).toContain('sixteenths');
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

  it('stuckJumpCoachingModalTip suggests guided triplet level', () => {
    const tip = stuckJumpCoachingModalTip(['triplets']);
    expect(tip).toMatch(/guided triplet/i);
    expect(tip.toLowerCase()).not.toContain('attempt');
  });
});
