import type { SkillMatrix, SkillVector } from './types';

export const MASTERY_STAR_COUNT = 4;

/** Chunky tiers shown on home (internal scores stay 0–100). */
export type SkillMasteryLevel = 1 | 2 | 3 | 4;

export const MASTERY_LEVEL_LABELS: Record<SkillMasteryLevel, string> = {
  1: 'New',
  2: 'Building',
  3: 'Solid',
  4: 'Strong',
};

/**
 * Map EMA score to 1–4 stars. Thresholds leave room to grow without feeling stuck at 1★.
 */
export function scoreToMasteryLevel(score: number): SkillMasteryLevel {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s < 42) return 1;
  if (s < 58) return 2;
  if (s < 76) return 3;
  return 4;
}

export interface SkillMasteryDisplay {
  vector: SkillVector;
  stars: SkillMasteryLevel;
  label: string;
}

export const SKILL_VECTOR_ORDER: SkillVector[] = [
  'valueSensation',
  'chromaIsolation',
  'temperatureIntuition',
  'relationalDecoding',
  'gamutMapping',
  'harmonicAlignment',
];

export const SKILL_VECTOR_COUNT = SKILL_VECTOR_ORDER.length;

/** Strong tier (4★) — shown on home as “mastered”. */
export function isSkillMastered(stars: SkillMasteryLevel): boolean {
  return stars >= 4;
}

export function masteryDisplayForMatrix(matrix: SkillMatrix): SkillMasteryDisplay[] {
  return SKILL_VECTOR_ORDER.map((vector) => {
    const stars = scoreToMasteryLevel(matrix[vector]);
    return {
      vector,
      stars,
      label: MASTERY_LEVEL_LABELS[stars],
    };
  });
}

export function countMasteredSkills(matrix: SkillMatrix): number {
  return masteryDisplayForMatrix(matrix).filter((item) => isSkillMastered(item.stars)).length;
}
